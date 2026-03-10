import requests
import cv2
import base64

AZURE_URL = "http://135.235.138.227:8000/recognize"


def recognize(frame):

    _, buf = cv2.imencode(".jpg", frame)

    img_b64 = base64.b64encode(buf).decode()

    r = requests.post(
        AZURE_URL,
        json={"image": img_b64},
        timeout=5
    )

    data = r.json()
    return data.get("student_id", "Unknown")
