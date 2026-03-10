from tcp_server import recognition_queue, face_queue
from tcp_server import send_id_to_s3
from azure_client import recognize
from utils.logger import log


def recognition_worker():

    last_result = None

    while True:

        frame = recognition_queue.get()

        try:

            result = recognize(frame)

        except Exception as e:

            log(f"Azure error {e}")

            result = "Unknown"

        if result != last_result:

            if not face_queue.full():

                face_queue.put(result)

            send_id_to_s3(result)

            last_result = result
