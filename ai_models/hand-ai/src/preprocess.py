import cv2
import numpy as np

def preprocess_image(image_path):
    """
    Load and prepare image for MediaPipe.
    MediaPipe expects RGB.
    """
    image = cv2.imread(image_path)
    if image is None:
        return None
    
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image_rgb

def resize_for_display(image, width=640):
    """
    Resize image while maintaining aspect ratio for consistent results.
    """
    h, w = image.shape[:2]
    aspect_ratio = h / w
    new_h = int(width * aspect_ratio)
    return cv2.resize(image, (width, new_h))
