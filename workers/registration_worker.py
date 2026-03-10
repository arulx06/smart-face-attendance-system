import tcp_server
import cv2
import os

from tcp_server import registration_queue, register_dir
from utils.logger import log


def registration_worker():

    while True:

        frame = registration_queue.get()

        if tcp_server.register_dir is None:
            continue

        tcp_server.register_counter += 1

        name = f"frame_{tcp_server.register_counter:04d}.jpg"

        cv2.imwrite(os.path.join(tcp_server.register_dir, name), frame)

        log(f"Saved {name}")
