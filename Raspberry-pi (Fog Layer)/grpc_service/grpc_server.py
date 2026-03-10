import grpc
import time

from concurrent import futures

from tcp_server import face_queue
from tcp_server import pi_state

import face_pb2
import face_pb2_grpc

GRPC_PORT = 50051


class FaceService(face_pb2_grpc.FaceServiceServicer):

    def StreamRecognitions(self, request, context):

        while True:

            if face_queue.empty():

                time.sleep(0.1)

                continue

            result = face_queue.get()

            yield face_pb2.RecognitionResponse(
                student_id=result
            )


def grpc_serve():

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=4)
    )

    face_pb2_grpc.add_FaceServiceServicer_to_server(
        FaceService(), server
    )

    server.add_insecure_port(f"[::]:{GRPC_PORT}")

    server.start()

    print("gRPC server started")

    server.wait_for_termination()
