import torch
from PIL import Image
import os
import json
import numpy as np
from model import get_model
from preprocess import predict_transform

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_PTH_PATH = os.path.join(PROJECT_ROOT, "saved_models", "flower_model.pth")
CLASSES_PATH = os.path.join(PROJECT_ROOT, "saved_models", "classes.json")

# Defaults
CLASSES = ["rose", "tulip", "sunflower", "daisy", "dandelion"]
if os.path.exists(CLASSES_PATH):
    with open(CLASSES_PATH, 'r') as f:
        CLASSES = json.load(f)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = None

def load_model_if_needed():
    global model
    if model is not None:
        return
    
    num_classes = len(CLASSES)
    model = get_model(num_classes=num_classes, pretrained=False)
    if os.path.exists(MODEL_PTH_PATH):
        model.load_state_dict(torch.load(MODEL_PTH_PATH, map_location=device))
        print(f"Loaded Flower AI model from {MODEL_PTH_PATH}")
    else:
        print("Warning: Flower AI model weights not found, using random weights.")
    
    model.to(device)
    model.eval()

def predict_image(image_path):
    load_model_if_needed()
    try:
        img = Image.open(image_path).convert("RGB")
        img_tensor = predict_transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = model(img_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            
            class_idx = predicted.item()
            conf_val = float(confidence.item())
            probs_val = probabilities[0].cpu().numpy()
            
            raw_scores = {CLASSES[i]: float(probs_val[i]) for i in range(len(CLASSES))}

        return CLASSES[class_idx], conf_val, raw_scores
    except Exception as e:
        print(f"Flower Prediction Error: {e}")
        return "Error in prediction", 0.0, {}

def get_backend_name():
    return "PyTorch/EfficientNet-B0 (Flowers)"
