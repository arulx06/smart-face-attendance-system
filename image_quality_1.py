import socket
import struct
import json
import cv2
import numpy as np
import torch
from facenet_pytorch import MTCNN

HOST = "0.0.0.0"
PORT = 9999

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

mtcnn = MTCNN(
    image_size=160,
    margin=20,
    device=device,
    keep_all=True
)

# ===================== SOCKET =====================

def recv_exact(sock, size):
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("Socket closed")
        data += chunk
    return data


# ===================== METRICS =====================

def compute_blur(gray):
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def compute_brightness(gray):
    return np.mean(gray)

def compute_sharpness(gray):
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1)
    return np.mean(np.sqrt(gx**2 + gy**2))


# ===================== FRAME ANALYSIS =====================

def process_frame(frame):

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    brightness = compute_brightness(gray)
    blur = compute_blur(gray)
    sharpness = compute_sharpness(gray)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    boxes, probs = mtcnn.detect(rgb)

    # -------- NO FACE --------
    if boxes is None:

        print(
            f"[NO FACE] "
            f"bright={brightness:.2f} "
            f"blur={blur:.2f} "
            f"sharp={sharpness:.2f}"
        )

        return

    # -------- FACE DETECTED --------
    for box, prob in zip(boxes, probs):

        x1, y1, x2, y2 = map(int, box)

        w = x2 - x1
        h = y2 - y1

        print(
            f"[FACE] "
            f"prob={prob:.3f} "
            f"size={w}x{h} "
            f"bright={brightness:.2f} "
            f"blur={blur:.2f} "
            f"sharp={sharpness:.2f}"
        )


# ===================== TCP SERVER =====================

def tcp_server():

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    server.bind((HOST, PORT))
    server.listen(1)

    print("📡 TCP Server listening")

    while True:

        conn, addr = server.accept()

        print("ESP32 connected:", addr)

        try:
            while True:

                meta_len = struct.unpack("<I", recv_exact(conn, 4))[0]
                meta = json.loads(recv_exact(conn, meta_len))

                pkt_type = meta.get("type", "")

                img_len = struct.unpack("<I", recv_exact(conn, 4))[0]

                if pkt_type != "FRAME":
                    continue

                img_bytes = recv_exact(conn, img_len)

                frame = cv2.imdecode(
                    np.frombuffer(img_bytes, np.uint8),
                    cv2.IMREAD_COLOR
                )

                if frame is None:
                    continue

                process_frame(frame)

        except Exception as e:

            print("⚠️ Connection lost:", e)

            conn.close()


# ===================== MAIN =====================

if __name__ == "__main__":
    tcp_server()
