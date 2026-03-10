import torch
from facenet_pytorch import InceptionResnetV1, MTCNN

device = torch.device("cpu")

print("Loading MTCNN...")
mtcnn = MTCNN(
    image_size=160,
    margin=20,
    device=device
)

print("Loading FaceNet...")
model = InceptionResnetV1(
    pretrained="vggface2"
).eval().to(device)

print("Models loaded")
