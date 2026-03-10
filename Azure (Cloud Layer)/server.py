from fastapi import FastAPI
import base64
import cv2
import numpy as np

from recognizer import recognize_face

app = FastAPI()

print("Azure Face Server Started")


@app.post("/recognize")
def recognize(data: dict):

    img_b64 = data["image"]

    img_bytes = base64.b64decode(img_b64)

    nparr = np.frombuffer(img_bytes, np.uint8)

    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    cv2.imwrite("debug.jpg", frame)

    if frame is None:
        print("ERROR: Frame decode failed")
        return {"student_id": "DecodeError"}

    student_id = recognize_face(frame)

    return {
        "student_id": student_id
    }
