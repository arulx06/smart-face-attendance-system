import cv2
import numpy as np
import torch
import os
import pickle

from incremental_encoder import encode_student
from model_loader import mtcnn, model
from encoding_db import encodeListKnown, studentIds


SIM_THRESHOLD = 0.80
ENCODE_FILE = "EncodeFile.p"

# Track last modification time of encoding file
encode_mtime = os.path.getmtime(ENCODE_FILE)

# Track already encoded students
encoded_students = set()


# ---------------------------------------------------
# Initialize encoded students from existing database
# ---------------------------------------------------

def initialize_encoded_students():

    global encoded_students

    for sid in studentIds:
        sid = sid.replace("_MEAN", "")
        encoded_students.add(sid)


# Run initialization once when module loads
initialize_encoded_students()


# ---------------------------------------------------
# Detect new student folders and encode them
# ---------------------------------------------------

def check_for_new_students():

    global encoded_students

    images_dir = "Images"

    if not os.path.exists(images_dir):
        return

    for folder in os.listdir(images_dir):

        folder_path = os.path.join(images_dir, folder)

        if not os.path.isdir(folder_path):
            continue

        # Extract student ID same way as EncodeGenerator
        student_id = folder.split("_")[0]

        if student_id not in encoded_students:

            print("New student detected:", student_id)

            encode_student(student_id)

            encoded_students.add(student_id)


# ---------------------------------------------------
# Reload encodings if EncodeFile.p changes
# ---------------------------------------------------

def maybe_reload():

    global encodeListKnown, studentIds, encode_mtime

    mtime = os.path.getmtime(ENCODE_FILE)

    if encode_mtime != mtime:

        print("Reloading encodings...")

        with open(ENCODE_FILE, "rb") as f:
            encodeListKnown, studentIds = pickle.load(f)

        encode_mtime = mtime


# ---------------------------------------------------
# Face recognition pipeline
# ---------------------------------------------------

def recognize_face(frame):

    print("Running recognition")

    # Detect new students
    check_for_new_students()

    # Reload encodings if updated
    maybe_reload()

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    print("Running MTCNN detect")

    face = mtcnn(rgb)

    if face is None:
        print("No face detected")
        return "No Face"

    device = next(model.parameters()).device
    face = face.unsqueeze(0).to(device)

    print("Generating embedding")

    with torch.no_grad():
        emb = model(face).cpu().numpy()[0]

    emb = emb / np.linalg.norm(emb)

    enc = np.array(encodeListKnown)

    sims = np.dot(enc, emb)

    best = np.argmax(sims)
    best_sim = sims[best]

    print("Best similarity:", best_sim)
    print("Matched ID:", studentIds[best])

    if best_sim >= SIM_THRESHOLD:
        print("MATCH FOUND")
        return studentIds[best]

    print("Unknown face")
    return "Unknown"
