import torch
from PIL import Image
import os
import cv2
import numpy as np
from .model import get_model
from .preprocess import transform

# Global model variable
model = None
classes = ["female", "male"]

def load_model_if_needed():
    global model
    if model is not None:
        return model
        
    print("Initializing gender model...")
    model = get_model(pretrained=False)
    model_path = os.path.join(os.path.dirname(__file__), "saved_models", "gender_model.pth")
    
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
cat_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalcatface.xml')

_animal_detector_model = None

def get_animal_detector():
    global _animal_detector_model
    if _animal_detector_model is None:
        import torchvision.models as models
        from torchvision.models import MobileNet_V2_Weights
        _animal_detector_model = models.mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
        _animal_detector_model.eval()
    return _animal_detector_model

def is_human(image_path):
    # 0. Check for animal content first using ImageNet MobileNetV2
    # ImageNet classes 0 to 397 are all animals. This is extremely robust for preventing misclassification of pets.
    try:
        import torchvision.transforms as transforms
        model = get_animal_detector()
        transform_val = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        img_pil = Image.open(image_path).convert('RGB')
        tensor = transform_val(img_pil).unsqueeze(0)
        with torch.no_grad():
            out = model(tensor)
        prob = torch.nn.functional.softmax(out[0], dim=0)
        conf, idx = torch.max(prob, 0)
        
        is_animal_id = idx.item() < 398
        if is_animal_id and conf.item() > 0.05:
            print(f"Animal detected in {image_path} (ID: {idx.item()}, Conf: {conf.item():.4f}). Rejecting as human.")
            return False
    except Exception as e:
        print(f"Animal detection pre-check error: {e}")

    img = cv2.imread(image_path)
    if img is None:
        return False
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Preprocess to improve detection in various lighting
    gray = cv2.equalizeHist(gray)
    
    # Check for cat face as a quick local fallback
    if not cat_cascade.empty():
        cats = cat_cascade.detectMultiScale(gray, 1.1, 4)
        if len(cats) > 0:
            print(f"Cat face detected locally in {image_path}. Rejecting as human.")
            return False
            
    # 1. Try frontal face (alt2) - most accurate, use minNeighbors=5 to reduce false positives
    faces = face_cascade.detectMultiScale(gray, 1.1, 5)
    if len(faces) > 0:
        return True
        
    # 2. Try default frontal face - robust/sensitive, use minNeighbors=5 to avoid background noise/animals
    faces_default = default_cascade.detectMultiScale(gray, 1.1, 5)
    if len(faces_default) > 0:
        return True

    # 3. Try profile face as backup
    profiles = profile_cascade.detectMultiScale(gray, 1.1, 5)
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
