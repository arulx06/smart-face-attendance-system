import time
from queue import Queue

log_queue = Queue()


def log(msg):
    log_queue.put(f"{time.strftime('%H:%M:%S')} {msg}")


def logger_worker():

    while True:
        print(log_queue.get())
