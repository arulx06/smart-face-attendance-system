import threading

from tcp_server import tcp_server
from workers.recognition_worker import recognition_worker
from workers.registration_worker import registration_worker
from grpc_service.grpc_server import grpc_serve
from utils.logger import logger_worker


if __name__ == "__main__":

    threading.Thread(target=logger_worker, daemon=True).start()
    threading.Thread(target=tcp_server, daemon=True).start()
    threading.Thread(target=recognition_worker, daemon=True).start()
    threading.Thread(target=registration_worker, daemon=True).start()

    grpc_serve()
