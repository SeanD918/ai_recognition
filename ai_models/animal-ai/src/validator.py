import torch
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import os
import cv2

# Load MobileNetV2 for broad animal detection
_animal_detector_model = None

def get_animal_detector():
    global _animal_detector_model
    if _animal_detector_model is None:
        from torchvision.models import MobileNet_V2_Weights
        _animal_detector_model = models.mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
        _animal_detector_model.eval()
    return _animal_detector_model

def is_human(image_path):
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    img = cv2.imread(image_path)
    if img is None: return False
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    return len(faces) > 0

def is_animal(image_path):
    # 1. Use ImageNet model to check for animal content first
    # This is more reliable than Haar Cascades for avoiding false positives on animals.
    model = get_animal_detector()
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    try:
        img = Image.open(image_path).convert('RGB')
        tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            out = model(tensor)
        
        prob = torch.nn.functional.softmax(out[0], dim=0)
        conf, idx = torch.max(prob, 0)
        
        # ImageNet: 0-397 are animals
        is_animal_id = idx.item() < 398
        print(f"Validation Debug: ID={idx.item()}, Conf={conf.item():.4f}, IsAnimalID={is_animal_id}")
        
        if is_animal_id and conf.item() > 0.02: # Lower threshold to be more permissive
            return True, "Animal detected"
            
        # 2. If ImageNet doesn't see an animal, check if it's a human
        if is_human(image_path):
            return False, "Human detected"
            
        return False, f"Not an animal (Detected ID: {idx.item()})"
    except Exception as e:
        print(f"Animal detection error: {e}")
        return True, "Error in detection, assuming animal"
