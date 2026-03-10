import socket
import struct
import json
import cv2
import os
import time
import pickle
import numpy as np
import torch
import grpc
import threading

from queue import Queue
from concurrent import futures
from facenet_pytorch import InceptionResnetV1, MTCNN

import face_pb2
import face_pb2_grpc

# ===================== CONFIG =====================
HOST = "0.0.0.0"
PORT = 9999
GRPC_PORT = 50051

ENCODE_FILE = "EncodeFile.p"
IMAGE_DIR = "Images"
DECODED_DIR = "Decoded_Images"
FACE_DIR = "Decoded_Faces"

TOP_K = 5
DIST_THRESHOLD = 1.1

os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(DECODED_DIR, exist_ok=True)
os.makedirs(FACE_DIR, exist_ok=True)

# ===================== GLOBAL FACE QUEUE =====================
# Queue carries FACE TENSORS (not raw images)
face_queue = Queue(maxsize=10)

# ===================== MODEL SETUP =====================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(
    image_size=160,
    margin=20,
    min_face_size=15,          # more sensitive for ESP32
    thresholds=[0.4, 0.5, 0.5],
    factor=0.709,
    post_process=True,
    device=device
)

model = InceptionResnetV1(
    pretrained="vggface2"
).eval().to(device)

# ===================== LOAD ENCODINGS =====================
encodeListKnown = []
studentIds = []
last_modified = None

def load_encodings():
    global encodeListKnown, studentIds
    with open(ENCODE_FILE, "rb") as f:
        encodeListKnown, studentIds = pickle.load(f)
    print(f"✅ Encodings loaded: {len(studentIds)}")

if os.path.exists(ENCODE_FILE):
    last_modified = os.path.getmtime(ENCODE_FILE)
    load_encodings()
else:
    print("⚠️ EncodeFile.p not found — recognition disabled")

# ===================== HELPERS =====================
def get_base_id(sid):
    return sid.replace("_MEAN", "")

def recv_exact(sock, size):
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("Socket closed")
        data += chunk
    return data

def safe_decode_jpeg(buf):
    if len(buf) < 1000:
        return None
    arr = np.frombuffer(buf, np.uint8)
    if arr[0] != 0xFF or arr[1] != 0xD8:
        return None
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

# ===================== FACE RECOGNITION CORE =====================
def recognize_face_from_tensor(face_tensor):
    global last_modified

    try:
        current_modified = os.path.getmtime(ENCODE_FILE)
        if current_modified != last_modified:
            print("🔄 EncodeFile updated — reloading")
            load_encodings()
            last_modified = current_modified
    except:
        pass

    face_tensor = face_tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        embedding = model(face_tensor).cpu().numpy()[0]

    embedding = embedding / np.linalg.norm(embedding)

    encodings = np.array(encodeListKnown)
    distances = np.linalg.norm(encodings - embedding, axis=1)

    # ---- PER-PERSON MIN DISTANCE (HYBRID) ----
    best_per_person = {}

    for idx, sid in enumerate(studentIds):
        pid = get_base_id(sid)
        d = distances[idx]

        if pid not in best_per_person:
            best_per_person[pid] = d
        else:
            best_per_person[pid] = min(best_per_person[pid], d)

    sorted_people = sorted(best_per_person.items(), key=lambda x: x[1])

    print("\n📊 FACE MATCH DEBUG (Per Person)")
    print("-" * 50)
    print(f"{'Rank':<5}{'ID':<10}{'Dist'}")
    print("-" * 50)

    for rank, (pid, dist) in enumerate(sorted_people[:TOP_K]):
        print(f"{rank:<5}{pid:<10}{dist:.4f}")

    best_id, min_dist = sorted_people[0]

    print("-" * 50)
    print(f"✅ BEST MATCH : {best_id}")
    print(f"🔎 MIN DIST   : {min_dist:.4f}")
    print("-" * 50)

    return best_id if min_dist < DIST_THRESHOLD else "Unknown"

# ===================== TCP SERVER (PRODUCER) =====================
frame_counter = 0

def tcp_server():
    global frame_counter

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(1)

    print(f"📡 TCP server listening on port {PORT}")

    while True:
        print("🕓 Waiting for ESP32...")
        conn, addr = server.accept()
        print(f"✅ ESP connected: {addr}")

        try:
            while True:
                meta_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                meta = json.loads(recv_exact(conn, meta_len).decode())

                mode = meta.get("mode", "")

                img_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                img_bytes = recv_exact(conn, img_len)
                frame_bgr = safe_decode_jpeg(img_bytes)

                if frame_bgr is None:
                    print("⚠️ TCP: JPEG decode failed")
                    continue

                frame_counter += 1
                ts = time.strftime("%Y%m%d_%H%M%S")
                base = f"frame_{frame_counter:05d}_{ts}"

                cv2.imwrite(os.path.join(DECODED_DIR, f"{base}.jpg"), frame_bgr)

                img_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

                if mode == "recognition":
                    # ---- DETECT ONCE (CORRECT DESIGN) ----
                    face_tensor = mtcnn(img_rgb)

                    if face_tensor is None:
                        print("❌ TCP: No face detected")
                        continue

                    if face_tensor.ndim == 4:
                        face_tensor = face_tensor[0]

                    # ---- ENQUEUE FACE FOR gRPC ----
                    if not face_queue.full():
                        face_queue.put(face_tensor)
                        print("📥 TCP enqueued FACE for gRPC")
                    else:
                        print("⚠️ gRPC face_queue FULL — dropping face")

                    # ---- SAVE ALIGNED FACE ----
                    aligned_np = (
                        face_tensor.permute(1, 2, 0)
                        .cpu().numpy() * 255
                    ).astype(np.uint8)

                    cv2.imwrite(
                        os.path.join(FACE_DIR, f"{base}_aligned.jpg"),
                        cv2.cvtColor(aligned_np, cv2.COLOR_RGB2BGR)
                    )

                    result = recognize_face_from_tensor(face_tensor)
                    print("[TCP RECOGNITION]", result)

                elif mode == "register":
                    person_id = meta.get("id", "")
                    if not person_id:
                        continue

                    save_dir = os.path.join(IMAGE_DIR, person_id)
                    os.makedirs(save_dir, exist_ok=True)

                    path = os.path.join(save_dir, f"{person_id}_{int(time.time())}.jpg")
                    cv2.imwrite(path, frame_bgr)
                    print(f"📸 Registered {person_id}")

        except Exception as e:
            print("❌ ESP disconnected:", e)
            conn.close()

# ===================== gRPC SERVICE (CONSUMER) =====================
class FaceService(face_pb2_grpc.FaceServiceServicer):

    def StreamRecognitions(self, request, context):
        print("🎯 gRPC client connected for recognition stream")

        while True:
            if face_queue.empty():
                print("⏳ gRPC waiting for face tensors...")
                time.sleep(0.2)
                continue

            face_tensor = face_queue.get()
            print("🟢 gRPC got face tensor")

            try:
                detected_id = recognize_face_from_tensor(face_tensor)
                print("🧠 gRPC recognized:", detected_id)
            except Exception as e:
                print("🔥 gRPC recognition error:", e)
                detected_id = "Error"

            yield face_pb2.RecognitionResponse(
                student_id=str(detected_id)
            )

            time.sleep(0.15)

# ===================== gRPC SERVER =====================
def grpc_serve():
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=4)
    )

    face_pb2_grpc.add_FaceServiceServicer_to_server(
        FaceService(), server
    )

    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()

    print(f"🚀 gRPC FaceService running on port {GRPC_PORT}")
    server.wait_for_termination()

# ===================== MAIN =====================
if __name__ == "__main__":
    threading.Thread(
        target=tcp_server,
        daemon=True
    ).start()

    grpc_serve()
