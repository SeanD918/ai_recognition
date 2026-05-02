import torch
import os
import json
import numpy as np
from preprocess import preprocess_image

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_PTH_PATH = os.path.join(PROJECT_ROOT, "saved_models", "hand_model.pth")
MODEL_KERAS_PATH = os.path.join(PROJECT_ROOT, "saved_models", "hand_model.keras")
CLASSES_PATH = os.path.join(PROJECT_ROOT, "saved_models", "classes.json")

# Default ASL classes for 10-class hand model
CLASSES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

if os.path.exists(CLASSES_PATH):
    try:
        with open(CLASSES_PATH, 'r') as f:
            CLASSES = json.load(f)
        print(f"Loaded {len(CLASSES)} classes from classes.json")
    except Exception as e:
        print(f"Error loading classes.json: {e}")

class HandDetector:
    def __init__(self):
        try:
            import mediapipe as mp
            self.mp_hands = mp.solutions.hands
            self.hands = self.mp_hands.Hands(
                static_image_mode=True,
                max_num_hands=1,
                min_detection_confidence=0.5
            )
            self.has_mediapipe = True
        except ImportError:
            self.hands = None
            self.has_mediapipe = False
            print("MediaPipe not installed, fallback logic disabled.")
            
        self.custom_model = None
        self.model_type = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.load_custom_model()

    def load_custom_model(self):
        # Priority 1: PyTorch Model
        if os.path.exists(MODEL_PTH_PATH):
            try:
                from train import HandGestureModel, LABELS
                self.labels = LABELS
                self.custom_model = HandGestureModel(num_classes=len(self.labels))
                self.custom_model.load_state_dict(torch.load(MODEL_PTH_PATH, map_location=self.device))
                self.custom_model.to(self.device)
                self.custom_model.eval()
                self.model_type = 'pytorch'
                print(f"Loaded custom PyTorch Hand AI model from {MODEL_PTH_PATH} ({len(self.labels)} classes)")
                return
            except Exception as e:
                print(f"Error loading custom PyTorch model: {e}")

        # Priority 2: Keras Model
        if os.path.exists(MODEL_KERAS_PATH):
            try:
                import tensorflow as tf
                self.custom_model = tf.keras.models.load_model(MODEL_KERAS_PATH)
                self.model_type = 'keras'
                print(f"Loaded custom Keras Hand AI model from {MODEL_KERAS_PATH}")
                return
            except Exception as e:
                print(f"Error loading custom Keras model: {e}")

    def predict_image(self, image_path):
        # Strict validation: Only hand images allowed
        from validator import is_hand
        valid_hand, message = is_hand(image_path)
        if not valid_hand:
            print(f"Validation failed: {message}")
            return f"Not a hand ({message})", 0.0, {}

        # If we have a Keras model, use it for direct image prediction
        if self.model_type == 'keras':
            import tensorflow as tf
            img = tf.keras.preprocessing.image.load_img(image_path, target_size=(224, 224))
            img_array = tf.keras.preprocessing.image.img_to_array(img)
            img_array = np.expand_dims(img_array, 0)
            img_array = img_array / 127.5 - 1.0 # Standard Keras normalization
            
            predictions = self.custom_model(img_array, training=False)
            score = predictions[0].numpy()
            
            class_idx = int(np.argmax(score))
            confidence = float(np.max(score))
            
            prediction = CLASSES[class_idx] if class_idx < len(CLASSES) else str(class_idx)
            raw_scores = {CLASSES[i]: float(score[i]) for i in range(min(len(CLASSES), len(score)))}
            
            return prediction, confidence, raw_scores

        # Otherwise use mediapipe for landmarks
        if not self.has_mediapipe:
            return "No ASL model loaded", 0.0, {"error": "Missing model and MediaPipe"}

        image_rgb = preprocess_image(image_path)
        if image_rgb is None:
            return "Invalid image", 0.0, {}
        
        results = self.hands.process(image_rgb)
        
        if not results.multi_hand_landmarks:
            return "No hands detected", 0.0, {"error": "No hands detected"}

        # If we have a PyTorch model, use it to predict with landmarks
        if self.model_type == 'pytorch':
            landmarks = []
            for lm in results.multi_hand_landmarks[0].landmark:
                landmarks.extend([lm.x, lm.y, lm.z])
            
            with torch.no_grad():
                input_tensor = torch.tensor([landmarks], dtype=torch.float32).to(self.device)
                output = self.custom_model(input_tensor)
                class_idx = torch.argmax(output, dim=1).item()
                prediction = self.labels[class_idx] if hasattr(self, 'labels') else class_idx
                return prediction, 1.0, {"asl_letter": prediction}
        
        return "No ASL model loaded", 0.0, {"error": "Missing model"}

# Initialize global detector
detector = HandDetector()

def predict_hand(image_path):
    try:
        count, confidence, info = detector.predict_image(image_path)
        return count, confidence, info
    except Exception as e:
        print(f"Prediction Error: {e}")
        return 0, 0.0, {"error": str(e)}

def load_model_if_needed():
    if detector.custom_model is None:
        detector.load_custom_model()

def get_backend_name():
    if detector.model_type == 'keras':
        return "Keras/TensorFlow"
    elif detector.model_type == 'pytorch':
        return "PyTorch Hand Model"
    return "No Model Loaded"
