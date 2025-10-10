# image_quality.py
import cv2
import numpy as np
import datetime

LOG_FILE = "quality_log.txt"


def log_quality_issue(reason, value=None):
    """
    Writes a timestamped log entry to quality_log.txt.
    """
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {reason}"
    if value is not None:
        entry += f" (Value: {value:.2f})"
    entry += "\n"
    with open(LOG_FILE, "a") as f:
        f.write(entry)


def is_blurry(image, threshold=35):
    """
    Detects blur using Laplacian variance.
    Relaxed threshold → accepts slightly soft images too.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    if variance < threshold:
        log_quality_issue("Blurry Image", variance)
        return True
    return False


def is_too_dark_or_bright(image, dark_thresh=30, bright_thresh=230):
    """
    Checks whether an image is too dark or too bright.
    Relaxed thresholds so normal lighting passes.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    mean_intensity = np.mean(gray)

    if mean_intensity < dark_thresh:
        log_quality_issue("Too Dark", mean_intensity)
        return True
    elif mean_intensity > bright_thresh:
        log_quality_issue("Too Bright", mean_intensity)
        return True

    return False


def is_face_too_small(face_box, frame_shape, min_ratio=0.02):
    """
    Detects if the detected face is too small relative to the frame.
    Relaxed from 5% → 2% of frame area.
    """
    (x1, y1, x2, y2) = face_box
    h, w = frame_shape[:2]
    face_area = (x2 - x1) * (y2 - y1)
    frame_area = h * w
    ratio = face_area / frame_area

    if ratio < min_ratio:
        log_quality_issue("Face Too Small", ratio)
        return True
    return False


def is_good_quality(face_img, face_box=None, frame_shape=None):
    """
    Returns True if the image passes all checks, False otherwise.
    Logs reasons internally.
    Relaxed checks for real-world attendance use.
    """
    if face_img is None or face_img.size == 0:
        log_quality_issue("Empty Face Image")
        return False

    # Check blur
    if is_blurry(face_img):
        return False

    # Check lighting
    if is_too_dark_or_bright(face_img):
        return False

    # Check face size (optional)
    if face_box is not None and frame_shape is not None:
        if is_face_too_small(face_box, frame_shape):
            return False

    return True
