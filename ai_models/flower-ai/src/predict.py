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
MODEL_KERAS_PATH = os.path.join(PROJECT_ROOT, "saved_models", "flower_model.keras")
CLASSES_PATH = os.path.join(PROJECT_ROOT, "saved_models", "classes.json")

# Defaults
CLASSES = ["rose", "tulip", "sunflower", "daisy", "dandelion"]
if os.path.exists(CLASSES_PATH):
    with open(CLASSES_PATH, 'r') as f:
        CLASSES = json.load(f)

device = "cuda" if torch.cuda.is_available() else "cpu"
model_type = None # 'pytorch' or 'keras'
model = None

def load_model_if_needed():
    global model, model_type
    if model is not None:
        return
    
    # Priority 1: PyTorch Model
    if os.path.exists(MODEL_PTH_PATH):
        try:
            num_classes = len(CLASSES)
            model = get_model(num_classes=num_classes, pretrained=False)
            model.load_state_dict(torch.load(MODEL_PTH_PATH, map_location=device))
            model.to(device)
            model.eval()
            model_type = 'pytorch'
            print(f"Loaded PyTorch flower model from {MODEL_PTH_PATH}")
        except Exception as e:
            print(f"Error loading PyTorch flower model: {e}")

    # Priority 2: Keras Model
    if not model and os.path.exists(MODEL_KERAS_PATH):
        try:
            import tensorflow as tf
            model = tf.keras.models.load_model(MODEL_KERAS_PATH)
            model_type = 'keras'
            print(f"Loaded Keras flower model from {MODEL_KERAS_PATH}")
        except Exception as e:
            print(f"Error loading Keras flower model: {e}")
    
    if not model:
        print("Warning: No flower model weights found, using random PyTorch weights.")
        model = get_model(num_classes=len(CLASSES), pretrained=False).to(device)
        model.eval()
        model_type = 'pytorch'

def predict_image(image_path):
    load_model_if_needed()
    try:
        if model_type == 'keras':
            import tensorflow as tf
            # Load and preprocess image for Keras (Expecting [0, 1] or similar)
            img = tf.keras.preprocessing.image.load_img(image_path, target_size=(224, 224))
            img_array = tf.keras.preprocessing.image.img_to_array(img)
            img_array = np.expand_dims(img_array, 0)
            img_array = img_array / 255.0 # Normalization for Keras
            
            # Prediction
            predictions = model(img_array, training=False)
            score = predictions[0].numpy()
            
            raw_scores = {CLASSES[i]: float(score[i]) for i in range(len(CLASSES))}
            class_idx = int(np.argmax(score))
            confidence = float(np.max(score))
            return CLASSES[class_idx], confidence, raw_scores
        else:
            # PyTorch Path
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
    global model_type
    if model_type == 'keras':
        return "Keras/EfficientNet (Flowers)"
    return "PyTorch/EfficientNet (Flowers)"
