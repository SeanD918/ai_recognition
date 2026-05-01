import torch
from PIL import Image
import os
import json
import cv2
import numpy as np
from model import get_model
from preprocess import predict_transform

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_PTH_PATH = os.path.join(PROJECT_ROOT, "saved_models", "animal_model.pth")
MODEL_KERAS_PATH = os.path.join(PROJECT_ROOT, "saved_models", "animal_model.keras")
CLASSES_PATH = os.path.join(PROJECT_ROOT, "saved_models", "classes.json")

# Default classes (fallback)
CLASSES = ["butterfly", "cat", "chicken", "cow", "dog", "elephant", "horse", "sheep", "spider", "squirrel"]

# Load dynamic classes if they exist
if os.path.exists(CLASSES_PATH):
    try:
        with open(CLASSES_PATH, 'r') as f:
            CLASSES = json.load(f)
        print(f"Loaded {len(CLASSES)} classes from classes.json")
    except Exception as e:
        print(f"Error loading classes.json: {e}")

# Initialize Model variables
device = "cuda" if torch.cuda.is_available() else "cpu"
model_type = None # 'pytorch' or 'keras'
model = None

def load_model_if_needed():
    global model, model_type
    if model is not None:
        return

    # Priority 1: PyTorch Model (Newly trained)
    if not model and os.path.exists(MODEL_PTH_PATH):
        try:
            model = get_model(num_classes=len(CLASSES), pretrained=False)
            model.load_state_dict(torch.load(MODEL_PTH_PATH, map_location=device))
            model.to(device)
            model.eval()
            model_type = 'pytorch'
            print(f"Loaded PyTorch animal model weights from {MODEL_PTH_PATH}")
        except Exception as e:
            print(f"Error loading PyTorch model weights: {e}")

    # Priority 2: Keras Model (User updated)
    if not model and os.path.exists(MODEL_KERAS_PATH):
        try:
            import tensorflow as tf
            model = tf.keras.models.load_model(MODEL_KERAS_PATH)
            model_type = 'keras'
            print(f"Loaded Keras animal model from {MODEL_KERAS_PATH}")
        except Exception as e:
            print(f"Error loading Keras model: {e}")

    if not model:
        print(f"Warning: No model weights found at {MODEL_PTH_PATH} or {MODEL_KERAS_PATH}")
        # Fallback to random weights pytorch
        model = get_model(num_classes=len(CLASSES), pretrained=False).to(device)
        model.eval()
        model_type = 'pytorch'

def get_backend_name():
    global model_type
    if model_type == 'keras':
        return "Keras/TensorFlow"
    elif model_type == 'pytorch':
        return "PyTorch/TorchVision"
    return "Unknown"



def predict_image(image_path):
    load_model_if_needed()
    
    # Strict validation: Only animal images allowed
    from validator import is_animal
    valid_animal, message = is_animal(image_path)
    if not valid_animal:
        print(f"Validation failed: {message}")
        return f"Not an animal ({message})", 0.0, {}
    
    # Animal Prediction
    try:
        if model_type == 'keras':
            import tensorflow as tf
            # Load and preprocess image for Keras (Expecting [0, 1])
            img = tf.keras.preprocessing.image.load_img(image_path, target_size=(224, 224))
            img_array = tf.keras.preprocessing.image.img_to_array(img)
            img_array = np.expand_dims(img_array, 0)
            img_array = img_array / 127.5 - 1.0 # Standard Keras normalization [-1, 1]
            
            # Use model(..., training=False) instead of model.predict for thread-safety and speed
            predictions = model(img_array, training=False)
            
            # Predictions from the model are already softmaxed
            score = predictions[0].numpy()
            
            # DEBUG: Print all class scores
            raw_scores = {CLASSES[i]: float(score[i]) for i in range(len(CLASSES))}
            print("\n--- Animal AI Debug Scores ---")
            for animal, s in raw_scores.items():
                print(f"{animal}: {s*100:.2f}%")
            
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
                
                # Unpack results
                class_idx = predicted.item()
                conf_val = float(confidence.item())
                probs_val = probabilities[0].cpu().numpy()
                
                # Create raw_scores dict
                raw_scores = {CLASSES[i]: float(probs_val[i]) for i in range(len(CLASSES))}
                
                # DEBUG: Print all class scores
                print("\n--- Animal AI Debug Scores (PyTorch) ---")
                for animal, s in raw_scores.items():
                    print(f"{animal}: {s*100:.2f}%")

            return CLASSES[class_idx], conf_val, raw_scores
    except Exception as e:
        print(f"Prediction Error: {e}")
        return "Error in prediction", 0.0, {}

