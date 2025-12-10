import time
import cv2
import pickle
import torch
import numpy as np
import grpc
from concurrent import futures
from facenet_pytorch import InceptionResnetV1, MTCNN
import os

import face_pb2
import face_pb2_grpc
from image_quality import is_good_quality

# ========== Setup ==========
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(image_size=160, margin=10, min_face_size=40, device=device)
model = InceptionResnetV1(pretrained='vggface2').eval().to(device)

ENCODE_FILE = "EncodeFile.p"
encodeListKnown, studentIds = [], []
last_modified = None

def load_encodings():
    global encodeListKnown, studentIds
    with open(ENCODE_FILE, "rb") as file:
        encodeListKnown, studentIds = pickle.load(file)
    print("Encodings loaded:", len(studentIds))

# Initial load
if os.path.exists(ENCODE_FILE):
    last_modified = os.path.getmtime(ENCODE_FILE)
    load_encodings()
else:
    print(f"{ENCODE_FILE} not found. No encodings loaded.")

cap = cv2.VideoCapture(0)
cap.set(3, 1280)
cap.set(4, 720)

# ========== Face Recognition ==========
def recognize_face(face_img):
    global last_modified
    # --- Check if pickle was updated ---
    try:
        current_modified = os.path.getmtime(ENCODE_FILE)
        if current_modified != last_modified:
            print("EncodeFile updated. Reloading encodings...")
            load_encodings()
            last_modified = current_modified
    except Exception as e:
        print("Error checking EncodeFile:", e)

    face_tensor = mtcnn(face_img)
    if face_tensor is None:
        return "No Face"
    face_tensor = face_tensor.unsqueeze(0).to(device)
    with torch.no_grad():
        encoding = model(face_tensor).cpu().numpy()[0]
    distances = np.linalg.norm(np.array(encodeListKnown) - encoding, axis=1)
    min_dist = np.min(distances)
    index = np.argmin(distances)
    threshold = 0.7
    if min_dist < threshold:
        return studentIds[index]
    else:
        return "Unknown"

# ========== gRPC Service ==========
class FaceService(face_pb2_grpc.FaceServiceServicer):
    def StreamRecognitions(self, request, context):
        while True:
            success, frame = cap.read()
            if not success:
                time.sleep(0.1)
                continue

            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            boxes, _ = mtcnn.detect(img_rgb)
            detected_id = "No Face"

            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = [int(b) for b in box]
                    h, w, _ = img_rgb.shape
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    if x2 <= x1 or y2 <= y1:
                        continue

                    face_img = img_rgb[y1:y2, x1:x2]
                    if face_img.size == 0:
                        continue

                    # Run Image Quality Filter
                    if not is_good_quality(face_img, (x1, y1, x2, y2), img_rgb.shape):
                        detected_id = "Error"
                        color = (0, 0, 255)  # Red box for low-quality frames
                    else:
                        try:
                            detected_id = recognize_face(face_img)
                            color = (0, 255, 0)  # Green box for recognized faces
                        except Exception as e:
                            print("Recognition error:", e)
                            detected_id = "Error"
                            color = (0, 255, 255)

                    # Draw bounding box + label on the frame
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame, detected_id, (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

            # Show webcam with annotations
            cv2.imshow("Face Recognition Server", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            # Send recognition result to gRPC client
            yield face_pb2.RecognitionResponse(student_id=str(detected_id))
            time.sleep(0.2)  # small delay to reduce CPU usage

# ========== Server Runner ==========
def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    face_pb2_grpc.add_FaceServiceServicer_to_server(FaceService(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("gRPC FaceService running on :50051")
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        print("Stopping server...")
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    serve()
