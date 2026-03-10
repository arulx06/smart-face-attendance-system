import os
import cv2
import torch
import numpy as np
import pickle
from facenet_pytorch import InceptionResnetV1, MTCNN
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
import matplotlib.pyplot as plt
import csv

# ===== CONFIGURATION =====
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
PICKLE_PATH = "EncodeFile.p"   # Your embeddings pickle
TEST_DIR = "Dataset"           # Folder with subfolders per person ID
OUTPUT_CSV = "test_results.csv"
CM_IMAGE = "confusion_matrix.png"
THRESHOLD = 0.9                # Euclidean distance threshold
# ============================

# ===== Load Models =====
print("[INFO] Loading models...")
mtcnn = MTCNN(image_size=160, margin=10, min_face_size=40, device=DEVICE)
model = InceptionResnetV1(pretrained='vggface2').eval().to(DEVICE)

# ===== Load Known Embeddings =====
with open(PICKLE_PATH, 'rb') as f:
    encodeListKnown, studentIds = pickle.load(f)
encodeListKnown = [torch.tensor(e, device=DEVICE) for e in encodeListKnown]
print(f"[INFO] Loaded {len(encodeListKnown)} known embeddings.")

# ===== Prepare Results =====
results = [["Image", "True_ID", "Predicted_ID", "Distance", "Match"]]
true_labels = []
pred_labels = []

# ===== Testing Loop =====
for person_id in os.listdir(TEST_DIR):
    person_path = os.path.join(TEST_DIR, person_id)
    if not os.path.isdir(person_path):
        continue

    print(f"\n[TESTING] {person_id}")

    for img_name in os.listdir(person_path):
        img_path = os.path.join(person_path, img_name)
        img = cv2.imread(img_path)
        if img is None:
            print(f"  [SKIP] Cannot read {img_name}")
            continue

        # Convert to RGB and detect face
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        face_tensor = mtcnn(img_rgb)
        if face_tensor is None:
            print(f"  [NO FACE] {img_name}")
            results.append([img_name, person_id, "No Face", None, "No"])
            continue

        # Generate embedding
        face_tensor = face_tensor.unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            embedding = model(face_tensor)[0]

        # Compare with known embeddings (Euclidean distance, same as main.py)
        distances = [torch.dist(embedding, e) for e in encodeListKnown]
        min_dist = float(torch.min(torch.stack(distances)))
        idx = int(torch.argmin(torch.stack(distances)))
        predicted_id = studentIds[idx] if min_dist < THRESHOLD else "Unknown"
        match_status = "Yes" if predicted_id == person_id else "No"

        print(f"  {img_name}: Predicted → {predicted_id} | Distance: {min_dist:.3f} | Match: {match_status}")
        results.append([img_name, person_id, predicted_id, min_dist, match_status])
        true_labels.append(person_id)
        pred_labels.append(predicted_id)

# ===== Save Results to CSV =====
with open(OUTPUT_CSV, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(results)

print(f"\n[INFO] Results saved to: {OUTPUT_CSV}")

# ===== Confusion Matrix =====
print("[INFO] Generating confusion matrix...")
labels = sorted(list(set(true_labels + pred_labels)))
cm = confusion_matrix(true_labels, pred_labels, labels=labels)

plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
plt.xlabel("Predicted ID")
plt.ylabel("True ID")
plt.title("Face Recognition Confusion Matrix")
plt.tight_layout()
plt.savefig(CM_IMAGE)
plt.close()
print(f"[INFO] Confusion matrix saved as: {CM_IMAGE}")

# ===== Classification Report =====
print("\n[INFO] Classification report:")
report = classification_report(true_labels, pred_labels, labels=labels, zero_division=0)
print(report)
