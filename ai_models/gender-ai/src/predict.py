import torch
from PIL import Image
import os
import cv2
import numpy as np
from model import get_model
from preprocess import transform

# Global model variable
model = None
classes = ["female", "male"]

def load_model_if_needed():
    global model
    if model is not None:
        return model
        
    print("Initializing gender model...")
    model = get_model(pretrained=False)
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models", "gender_model.pth")
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location="cpu"))
        print("Loaded gender model weights.")
    else:
        print("Warning: Gender model weights not found.")
    
    model.eval()
    return model

# Face detectors for human verification
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
default_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
classes = ["female", "male"]

def is_human(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return False
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Preprocess to improve detection in various lighting
    gray = cv2.equalizeHist(gray)
    
    # 1. Try frontal face (alt2) - most accurate
    faces = face_cascade.detectMultiScale(gray, 1.1, 3)
    if len(faces) > 0:
        return True
        
    # 2. Try default frontal face - more robust/sensitive
    faces_default = default_cascade.detectMultiScale(gray, 1.05, 3)
    if len(faces_default) > 0:
        return True

    # 3. Try profile face as backup
    profiles = profile_cascade.detectMultiScale(gray, 1.1, 3)
    return len(profiles) > 0

def predict_image(image_path):
    # 1. Image Check (Human only)
    if not is_human(image_path):
        print(f"No human face detected in {image_path}")
        return "Not a human", 0.0
        
    # 2. Gender Prediction
    try:
        current_model = load_model_if_needed()
        img = Image.open(image_path).convert("RGB")
        img = transform(img).unsqueeze(0)

        with torch.no_grad():
            outputs = current_model(img)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)

        result = classes[predicted.item()]
        # Prettify for frontend
        return result.capitalize(), confidence.item()
    except Exception as e:
        print(f"Prediction error: {e}")
        return "Internal server error during prediction", 0.0
