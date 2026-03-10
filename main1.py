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

from enum import Enum
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

os.makedirs(IMAGE_DIR, exist_ok=True)

# ===================== STATE =====================
class PiState(Enum):
    RECOGNITION = 1
    REGISTER_PREP = 2
    REGISTER_ACTIVE = 3

pi_state = PiState.RECOGNITION
current_register_id = None
register_dir = None
register_counter = 0

# ===================== QUEUE =====================
face_queue = Queue(maxsize=10)

# ===================== MODELS =====================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(image_size=160, margin=20, device=device)
model = InceptionResnetV1(pretrained="vggface2").eval().to(device)

# ===================== LOAD ENCODINGS =====================
encodeListKnown = []
studentIds = []

if os.path.exists(ENCODE_FILE):
    with open(ENCODE_FILE, "rb") as f:
        encodeListKnown, studentIds = pickle.load(f)
    print(f"✅ Encodings loaded: {len(studentIds)}")
else:
    print("⚠️ EncodeFile.p not found")

# ===================== HELPERS =====================
def recv_exact(sock, size):
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("Socket closed")
        data += chunk
    return data

# ===================== RECOGNITION =====================
def recognize_and_print(face_tensor):
    face_tensor = face_tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        emb = model(face_tensor).cpu().numpy()[0]

    emb = emb / np.linalg.norm(emb)
    enc = np.array(encodeListKnown)

    sims = np.dot(enc, emb)
    best = np.argmax(sims)
    best_sim = sims[best]

    best_id = studentIds[best] if best_sim >= 0.8 else "Unknown"

    print("📊 RECOGNITION")
    print(f"   ID   : {best_id}")
    print(f"   SIM  : {best_sim:.4f}")
    print("-" * 40)

    return best_id

# ===================== TCP SERVER =====================
def tcp_server():
    global pi_state, current_register_id, register_dir, register_counter

    while True:
        try:
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind((HOST, PORT))
            server.listen(1)
            print(f"📡 TCP listening on {PORT}")

            conn, addr = server.accept()
            print("✅ ESP32 connected:", addr)

            conn.settimeout(5.0)

            while True:
                meta_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                meta = json.loads(recv_exact(conn, meta_len))
                pkt_type = meta.get("type", "")
                cmd = meta.get("cmd", "")
                pid = meta.get("id", "")

                img_len = struct.unpack("<I", recv_exact(conn, 4))[0]

                if pkt_type == "FRAME":
                    img_bytes = recv_exact(conn, img_len)
                else:
                    img_bytes = None

                # ---------- COMMANDS ----------
                if cmd == "REGISTER_ID":
                    pi_state = PiState.REGISTER_PREP
                    current_register_id = pid
                    register_dir = os.path.join(IMAGE_DIR, pid)
                    os.makedirs(register_dir, exist_ok=True)
                    register_counter = 0
                    face_queue.queue.clear()
                    print(f"🟡 PI → REGISTER_PREP (ID={pid})")
                    continue

                if cmd == "REGISTER_START":
                    pi_state = PiState.REGISTER_ACTIVE
                    print("🔴 PI → REGISTER_ACTIVE")
                    continue

                if cmd == "REGISTER_STOP":
                    pi_state = PiState.RECOGNITION
                    current_register_id = None
                    register_dir = None
                    print("🟢 PI → RECOGNITION")
                    continue

                # ---------- IMAGE ----------
                if img_bytes is None:
                    continue

                frame = cv2.imdecode(
                    np.frombuffer(img_bytes, np.uint8),
                    cv2.IMREAD_COLOR
                )
                if frame is None:
                    continue

                # ---------- REGISTRATION ----------
                if pi_state == PiState.REGISTER_ACTIVE:
                    register_counter += 1
                    name = f"frame_{register_counter:04d}.jpg"
                    cv2.imwrite(os.path.join(register_dir, name), frame)
                    print(f"[REGISTER] Saved {name}")
                    continue

                # ---------- RECOGNITION ----------
                if pi_state == PiState.RECOGNITION:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    boxes, _ = mtcnn.detect(rgb)
                    if boxes is None:
                        continue

                    for box in boxes:
                        x1, y1, x2, y2 = map(int, box)
                        crop = rgb[y1:y2, x1:x2]
                        if crop.size == 0:
                            continue
                        face = mtcnn(crop)
                        if face is None:
                            continue

                        recognize_and_print(face)

                        if not face_queue.full():
                            face_queue.put(face)

        except Exception as e:
            print("⚠️ TCP error, restarting:", e)
            time.sleep(1)

# ===================== gRPC =====================
class FaceService(face_pb2_grpc.FaceServiceServicer):
    def StreamRecognitions(self, request, context):
        while True:
            if pi_state != PiState.RECOGNITION or face_queue.empty():
                time.sleep(0.2)
                continue
            face = face_queue.get()
            yield face_pb2.RecognitionResponse(
                student_id=recognize_and_print(face)
            )

def grpc_serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    face_pb2_grpc.add_FaceServiceServicer_to_server(FaceService(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    print("🚀 gRPC running")
    server.wait_for_termination()

# ===================== MAIN =====================
if __name__ == "__main__":
    threading.Thread(target=tcp_server, daemon=True).start()
    grpc_serve()

