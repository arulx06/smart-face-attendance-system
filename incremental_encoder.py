import os
import cv2
import torch
import pickle
import numpy as np

from facenet_pytorch import InceptionResnetV1, MTCNN

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "Images")
PICKLE_FILE = os.path.join(BASE_DIR, "EncodeFile.p")

device = torch.device("cpu")

mtcnn = MTCNN(image_size=160, margin=20, device=device)
model = InceptionResnetV1(pretrained="vggface2").eval().to(device)


def encode_student(student_id):

    folder = os.path.join(IMAGES_DIR, student_id)

    if not os.path.exists(folder):
        return

    person_embeddings = []

    for img_file in os.listdir(folder):

        img_path = os.path.join(folder, img_file)

        img = cv2.imread(img_path)
        if img is None:
            continue

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        face_tensor = mtcnn(img_rgb)
        if face_tensor is None:
            continue

        if face_tensor.ndim == 4:
            face_tensor = face_tensor[0]

        face_tensor = face_tensor.unsqueeze(0).to(device)

        with torch.no_grad():
            embedding = model(face_tensor).cpu().numpy()[0]

        embedding = embedding / np.linalg.norm(embedding)

        person_embeddings.append(embedding)

    if len(person_embeddings) == 0:
        return

    avg_embedding = np.mean(person_embeddings, axis=0)
    avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)

    # ---------------- LOAD EXISTING ----------------

    if os.path.exists(PICKLE_FILE):

        with open(PICKLE_FILE, "rb") as f:
            encodeListKnown, studentIds = pickle.load(f)

    else:
        encodeListKnown = []
        studentIds = []

    # ---------------- APPEND NEW ----------------

    encodeListKnown.append(avg_embedding)
    studentIds.append(student_id + "_MEAN")

    for emb in person_embeddings:
        encodeListKnown.append(emb)
        studentIds.append(student_id)

    # ---------------- ATOMIC SAVE ----------------

    tmp_file = PICKLE_FILE + ".tmp"

    with open(tmp_file, "wb") as f:
        pickle.dump([encodeListKnown, studentIds], f)

    os.replace(tmp_file, PICKLE_FILE)
