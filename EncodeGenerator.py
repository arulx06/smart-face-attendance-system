import os
import cv2
import torch
import numpy as np
import pickle
from facenet_pytorch import InceptionResnetV1, MTCNN

# ===================== Setup =====================
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(image_size=160, margin=10, min_face_size=40, device=device)
model = InceptionResnetV1(pretrained='vggface2').eval().to(device)

# ===================== Paths =====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # directory of EncodeGenerator.py
IMAGES_DIR = os.path.join(BASE_DIR, "Images")         # absolute path to Images folder
PICKLE_FILE = os.path.join(BASE_DIR, "EncodeFile.p")  # absolute path to pickle file

print("Encoding started...")

encodeListKnown = []
studentIds = []

# use IMAGES_DIR instead of relative "Images"
if not os.path.exists(IMAGES_DIR):
    print(f"Images folder not found at {IMAGES_DIR}")
    exit(1)

for person_folder in os.listdir(IMAGES_DIR):
    person_path = os.path.join(IMAGES_DIR, person_folder)
    if os.path.isdir(person_path):
        student_code = person_folder.split("_")[0]

        person_embeddings = []
        for img_file in os.listdir(person_path):
            img_path = os.path.join(person_path, img_file)
            img = cv2.imread(img_path)
            if img is not None:
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                face_tensor = mtcnn(img_rgb)
                if face_tensor is not None:
                    face_tensor = face_tensor.unsqueeze(0).to(device)
                    with torch.no_grad():
                        embedding = model(face_tensor).cpu().numpy()[0]
                    person_embeddings.append(embedding)

        for emb in person_embeddings:
            encodeListKnown.append(emb)
            studentIds.append(student_code)

encodeListKnownIds = [encodeListKnown, studentIds]
print(studentIds)
print("Encoding complete.")

with open(PICKLE_FILE, 'wb') as file:
    pickle.dump(encodeListKnownIds, file)
print(f"File saved as {PICKLE_FILE}")
