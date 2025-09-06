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

# ===================== Load Images =====================
folder_path = 'Images'
RegisImgPathList = os.listdir(folder_path)
imgList = []
studentIds = []

for path in RegisImgPathList:
    img_path = os.path.join(folder_path, path)
    img = cv2.imread(img_path)
    if img is not None:
        imgList.append(img)
        studentIds.append(os.path.splitext(path)[0])

# ===================== Encoding Function =====================
def findEncoding(imagesList):
    encodeList = []
    for img in imagesList:
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Face detection & alignment
        face_tensor = mtcnn(img_rgb)

        if face_tensor is not None:
            face_tensor = face_tensor.unsqueeze(0).to(device)
            with torch.no_grad():
                encoding = model(face_tensor).cpu().numpy()[0]
                encodeList.append(encoding)
        else:
            print("Warning: No face detected in one image.")
            encodeList.append(np.zeros(512))  # Placeholder for failed detection
    return encodeList

# ===================== Generate & Save Encodings =====================
print("Encoding started...")
encodeListKnown = findEncoding(imgList)
encodeListKnownIds = [encodeListKnown, studentIds]
print(studentIds)
print("Encoding complete.")

with open("EncodeFile.p", 'wb') as file:
    pickle.dump(encodeListKnownIds, file)
print("File saved as EncodeFile.p")
