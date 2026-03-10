import grpc
from concurrent import futures
import time

import face_pb2
import face_pb2_grpc

class FaceService(face_pb2_grpc.FaceServiceServicer):
    def StreamFace(self, request, context):
        yield face_pb2.FaceResponse(message="gRPC server running")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    face_pb2_grpc.add_FaceServiceServicer_to_server(FaceService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("✅ gRPC server started on port 50051")
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
