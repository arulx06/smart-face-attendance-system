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

# ===================== LOGGER =====================
log_queue = Queue()

def log(msg):
    log_queue.put(f"{time.strftime('%H:%M:%S')} {msg}")

def logger_worker():
    while True:
        print(log_queue.get())

# ===================== STATE =====================
class PiState(Enum):
    RECOGNITION = 1
    REGISTER_PREP = 2
    REGISTER_ACTIVE = 3

pi_state = PiState.RECOGNITION
current_register_id = None
register_dir = None
register_counter = 0

# ===================== QUEUES =====================
recognition_queue = Queue(maxsize=5)
registration_queue = Queue(maxsize=100)
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
    log(f"✅ Encodings loaded: {len(studentIds)}")
else:
    log("⚠️ EncodeFile.p not found")

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
def recognize_and_log(face_tensor):
    face_tensor = face_tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        emb = model(face_tensor).cpu().numpy()[0]

    emb = emb / np.linalg.norm(emb)
    sims = np.dot(np.array(encodeListKnown), emb)

    best = np.argmax(sims)
    best_sim = sims[best]
    best_id = studentIds[best] if best_sim >= 0.8 else "Unknown"

    log(f"[REC] ID={best_id} SIM={best_sim:.4f}")
    return best_id

# ===================== TCP SERVER (FAST I/O) =====================
def tcp_server():
    global pi_state, current_register_id, register_dir, register_counter

    while True:
        try:
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind((HOST, PORT))
            server.listen(1)
            log(f"📡 TCP listening on {PORT}")

            conn, addr = server.accept()
            conn.settimeout(None)
            log(f"✅ ESP32 connected: {addr}")

            while True:
                meta_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                meta = json.loads(recv_exact(conn, meta_len))
                pkt_type = meta.get("type", "")
                cmd = meta.get("cmd", "")
                pid = meta.get("id", "")

                img_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                img_bytes = recv_exact(conn, img_len) if pkt_type == "FRAME" else None

                # ---------- COMMANDS ----------
                if cmd == "REGISTER_ID":
                    pi_state = PiState.REGISTER_PREP
                    current_register_id = pid
                    register_dir = os.path.join(IMAGE_DIR, pid)
                    os.makedirs(register_dir, exist_ok=True)
                    register_counter = 0

                    with recognition_queue.mutex:
                        recognition_queue.queue.clear()
                    with registration_queue.mutex:
                        registration_queue.queue.clear()

                    log(f"🟡 PI → REGISTER_PREP (ID={pid})")
                    continue

                if cmd == "REGISTER_START":
                    pi_state = PiState.REGISTER_ACTIVE
                    log("🔴 PI → REGISTER_ACTIVE")
                    continue

                if cmd == "REGISTER_STOP":
                    pi_state = PiState.RECOGNITION
                    current_register_id = None
                    register_dir = None
                    log("🟢 PI → RECOGNITION")
                    continue

                # ---------- FRAME DISPATCH ----------
                if img_bytes is None:
                    continue

                frame = cv2.imdecode(
                    np.frombuffer(img_bytes, np.uint8),
                    cv2.IMREAD_COLOR
                )
                if frame is None:
                    continue

                if pi_state == PiState.REGISTER_ACTIVE:
                    if not registration_queue.full():
                        registration_queue.put(frame)

                elif pi_state == PiState.RECOGNITION:
                    if not recognition_queue.full():
                        recognition_queue.put(frame)

        except Exception as e:
            log(f"⚠️ TCP error, restarting: {e}")
            time.sleep(1)

# ===================== RECOGNITION WORKER =====================
def recognition_worker():
    while True:
        frame = recognition_queue.get()

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        boxes, _ = mtcnn.detect(rgb)
        if boxes is None:
            continue

        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            crop = rgb[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            try:
                face = mtcnn(crop)
            except RuntimeError as e:
                log(f"[REC] MTCNN error ignored: {e}")
                continue

            if face is None:
                continue


            recognize_and_log(face)

            if not face_queue.full():
                face_queue.put(face)

# ===================== REGISTRATION WORKER =====================
def registration_worker():
    global register_counter

    while True:
        frame = registration_queue.get()

        if register_dir is None:
            continue

        register_counter += 1
        name = f"frame_{register_counter:04d}.jpg"
        cv2.imwrite(os.path.join(register_dir, name), frame)
        log(f"[REG] Saved {name}")

# ===================== gRPC =====================
class FaceService(face_pb2_grpc.FaceServiceServicer):
    def StreamRecognitions(self, request, context):
        while True:
            if pi_state != PiState.RECOGNITION or face_queue.empty():
                time.sleep(0.2)
                continue

            face = face_queue.get()
            yield face_pb2.RecognitionResponse(
                student_id=recognize_and_log(face)
            )

def grpc_serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    face_pb2_grpc.add_FaceServiceServicer_to_server(FaceService(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    log("🚀 gRPC running")
    server.wait_for_termination()

# ===================== MAIN =====================
if __name__ == "__main__":
    threading.Thread(target=logger_worker, daemon=True).start()
    threading.Thread(target=tcp_server, daemon=True).start()
    threading.Thread(target=recognition_worker, daemon=True).start()
    threading.Thread(target=registration_worker, daemon=True).start()
    grpc_serve()
