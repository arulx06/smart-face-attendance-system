import os
import cv2
import torch
import numpy as np
import pickle

from facenet_pytorch import InceptionResnetV1, MTCNN

# ===================== Setup =====================

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

mtcnn = MTCNN(
    image_size=160,
    margin=20,
    min_face_size=20,
    thresholds=[0.5, 0.6, 0.6],
    factor=0.709,
    post_process=True,
    device=device
)

model = InceptionResnetV1(
    pretrained='vggface2'
).eval().to(device)

# ===================== Paths =====================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "Images")
PICKLE_FILE = os.path.join(BASE_DIR, "EncodeFile.p")
DEBUG_ALIGNED_DIR = os.path.join(BASE_DIR, "Aligned_Debug")

os.makedirs(DEBUG_ALIGNED_DIR, exist_ok=True)

print("===================================")
print(" Face Encoding Generator Started ")
print("===================================")

encodeListKnown = []
studentIds = []

# ===================== Validation =====================

if not os.path.exists(IMAGES_DIR):
    print(f"[ERROR] Images folder not found: {IMAGES_DIR}")
    exit(1)

# ===================== Encoding Loop =====================

for person_folder in os.listdir(IMAGES_DIR):
    person_path = os.path.join(IMAGES_DIR, person_folder)

    if not os.path.isdir(person_path):
        continue

    student_code = person_folder.split("_")[0]
    person_embeddings = []

    print(f"\n[INFO] Processing: {student_code}")

    for img_file in os.listdir(person_path):
        img_path = os.path.join(person_path, img_file)

        img = cv2.imread(img_path)
        if img is None:
            print(f"[WARN] Cannot read image: {img_path}")
            continue

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        face_tensor = mtcnn(img_rgb)
        if face_tensor is None:
            print(f"[WARN] No face detected: {img_path}")
            continue

        # If multiple faces detected, take first
        if face_tensor.ndim == 4:
            face_tensor = face_tensor[0]

        # ================= DEBUG: Save aligned face =================

        aligned_np = (
            face_tensor.permute(1, 2, 0)
            .cpu()
            .numpy() * 255
        ).astype(np.uint8)

        cv2.imwrite(
            os.path.join(DEBUG_ALIGNED_DIR, f"{student_code}_{img_file}"),
            cv2.cvtColor(aligned_np, cv2.COLOR_RGB2BGR)
        )

        # ================= Embedding =================

        face_tensor = face_tensor.unsqueeze(0).to(device)

        with torch.no_grad():
            embedding = model(face_tensor).cpu().numpy()[0]

        # L2 Normalization
        embedding = embedding / np.linalg.norm(embedding)

        person_embeddings.append(embedding)

    # ===================== HYBRID STORE =====================

    if len(person_embeddings) > 0:

        # ---- Mean embedding ----
        avg_embedding = np.mean(person_embeddings, axis=0)
        avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)

        encodeListKnown.append(avg_embedding)
        studentIds.append(student_code + "_MEAN")

        # ---- All individual embeddings ----
        for emb in person_embeddings:
            encodeListKnown.append(emb)
            studentIds.append(student_code)

        print(f"[OK] {student_code}: mean + {len(person_embeddings)} samples stored")

    else:
        print(f"[SKIP] {student_code}: no valid faces found")

# ===================== Save Encodings =====================

with open(PICKLE_FILE, 'wb') as file:
    pickle.dump([encodeListKnown, studentIds], file)

print("\n===================================")
print(" Encoding Completed Successfully ")
print("===================================")
print(f"Total embeddings stored: {len(studentIds)}")
print(f"Saved to: {PICKLE_FILE}")
print(f"Aligned faces saved to: {DEBUG_ALIGNED_DIR}")
