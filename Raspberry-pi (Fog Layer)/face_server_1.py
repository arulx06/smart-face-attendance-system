import socket
import struct
import json
import cv2
import os
import time
import pickle
import numpy as np
import torch

from facenet_pytorch import InceptionResnetV1, MTCNN
from image_quality import is_good_quality

# ===================== CONFIG =====================
HOST = "0.0.0.0"
PORT = 9999
ENCODE_FILE = "EncodeFile.p"
IMAGE_DIR = "Images"

os.makedirs(IMAGE_DIR, exist_ok=True)

# ===================== MODEL SETUP =====================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(
    image_size=160,
    margin=10,
    min_face_size=40,
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

# ===================== FACE RECOGNITION =====================
def recognize_face(face_img):
    global last_modified

    try:
        current_modified = os.path.getmtime(ENCODE_FILE)
        if current_modified != last_modified:
            print("🔄 EncodeFile updated — reloading")
            load_encodings()
            last_modified = current_modified
    except Exception:
        pass

    try:
        face_tensor = mtcnn(face_img)
    except RuntimeError:
        return "No Face"

    if face_tensor is None:
        return "No Face"

    face_tensor = face_tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        encoding = model(face_tensor).cpu().numpy()[0]

    distances = np.linalg.norm(
        np.array(encodeListKnown) - encoding,
        axis=1
    )

    min_dist = np.min(distances)
    idx = np.argmin(distances)

    return studentIds[idx] if min_dist < 0.7 else "Unknown"

# ===================== TCP SERVER =====================
def tcp_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(1)

    print(f"📡 TCP server listening on {PORT}")

    while True:
        print("🕓 Waiting for ESP32...")
        conn, addr = server.accept()
        print(f"✅ ESP connected: {addr}")

        try:
            while True:
                # ---------- METADATA ----------
                meta_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                if meta_len <= 0 or meta_len > 1024:
                    raise ValueError("Invalid metadata length")

                meta = json.loads(recv_exact(conn, meta_len).decode())
                mode = meta.get("mode", "")
                person_id = meta.get("id", "")

                # ---------- IMAGE ----------
                img_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                if img_len <= 0 or img_len > 600_000:
                    raise ValueError("Invalid image length")

                img_bytes = recv_exact(conn, img_len)
                frame = safe_decode_jpeg(img_bytes)

                if frame is None:
                    print("⚠️ JPEG decode failed")
                    continue

                # ---------- MODE HANDLING ----------
                if mode == "recognition":
                    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    boxes, _ = mtcnn.detect(img_rgb)

                    result = "No Face"

                    if boxes is not None:
                        for box in boxes:
                            x1, y1, x2, y2 = map(int, box)
                            h, w, _ = img_rgb.shape

                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(w, x2), min(h, y2)

                            face = img_rgb[y1:y2, x1:x2]
                            if face.size == 0:
                                continue

                            if not is_good_quality(face, (x1, y1, x2, y2), img_rgb.shape):
                                result = "Low Quality"
                            else:
                                result = recognize_face(face)

                            break  # only first face

                    print("[RECOGNITION]", result)

                elif mode == "register":
                    if not person_id:
                        print("⚠️ Register frame without ID")
                        continue

                    save_dir = os.path.join(IMAGE_DIR, person_id)
                    os.makedirs(save_dir, exist_ok=True)

                    path = os.path.join(save_dir, f"{person_id}.jpg")
                    cv2.imwrite(path, frame)

                    print(f"📸 Registered ID {person_id}")

                else:
                    print(f"⚠️ Unknown mode: {mode}")

        except Exception as e:
            print("❌ ESP disconnected:", e)
            conn.close()

# ===================== MAIN =====================
if __name__ == "__main__":
    tcp_server()
