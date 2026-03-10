import socket
import struct
import json
import cv2
import os
import time
import multiprocessing
import numpy as np
import threading

from enum import Enum
from queue import Queue

from utils.logger import log


HOST = "0.0.0.0"
PORT = 9999

IMAGE_DIR = "Images"

os.makedirs(IMAGE_DIR, exist_ok=True)

tcp_lock = threading.Lock()
tcp_conn = None

recognition_queue = Queue(maxsize=10)
registration_queue = Queue(maxsize=200)
face_queue = Queue(maxsize=10)


class PiState(Enum):

    RECOGNITION = 1
    REGISTER_PREP = 2
    REGISTER_ACTIVE = 3


pi_state = PiState.RECOGNITION

current_register_id = None
register_dir = None
register_counter = 0


def recv_exact(sock, size):

    data = b""

    while len(data) < size:

        chunk = sock.recv(size - len(data))

        if not chunk:
            raise ConnectionError("Socket closed")

        data += chunk

    return data

def tcp_server():

    global pi_state
    global current_register_id
    global register_dir
    global register_counter
    global tcp_conn

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    server.bind((HOST, PORT))

    server.listen(1)

    log("TCP server started")

    while True:

        conn, addr = server.accept()

        tcp_conn = conn

        log(f"ESP connected {addr}")

        try:

            while True:

                meta_len = struct.unpack("<I", recv_exact(conn, 4))[0]

                meta = json.loads(recv_exact(conn, meta_len))

                cmd = meta.get("cmd", "")
                pid = meta.get("id", "")
                pkt_type = meta.get("type", "")

                img_len = struct.unpack("<I", recv_exact(conn, 4))[0]

                img_bytes = recv_exact(conn, img_len) if pkt_type == "FRAME" else None

                if cmd == "REGISTER_ID":

                    pi_state = PiState.REGISTER_PREP

                    current_register_id = pid

                    register_dir = os.path.join(IMAGE_DIR, pid)

                    os.makedirs(register_dir, exist_ok=True)

                    register_counter = 0

                    recognition_queue.queue.clear()
                    registration_queue.queue.clear()

                    log(f"REGISTER PREP {pid}")

                    continue

                if cmd == "REGISTER_START":
                    if current_register_id is None:
                        log("ERROR: REGISTER_START received without REGISTER_ID")
                        continue

                    pi_state = PiState.REGISTER_ACTIVE

                    log("REGISTER ACTIVE")

                    continue

                if cmd == "REGISTER_STOP":

                    student_id = current_register_id

                    pi_state = PiState.RECOGNITION

                    log(f"Registration finished for {student_id}. Images saved only.")

                    continue

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

                else:
                    if not recognition_queue.full():
                        recognition_queue.put(frame)

        except Exception as e:

            log(f"TCP error {e}")

            conn.close()


def send_id_to_s3(student_id):

    global tcp_conn

    if tcp_conn is None:
        return

    try:

        meta = json.dumps({
            "type": "RESULT",
            "cmd": "",
            "id": "",
            "student_id": student_id
        }).encode()

        meta_len = struct.pack("<I", len(meta))
        img_len = struct.pack("<I", 0)

        with tcp_lock:

            tcp_conn.sendall(meta_len)
            tcp_conn.sendall(meta)
            tcp_conn.sendall(img_len)

    except Exception as e:

        log(f"Send error {e}")

        tcp_conn = None
