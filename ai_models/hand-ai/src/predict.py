import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow CPU feature guard logs
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['TF_NUM_INTRAOP_THREADS'] = '1'
os.environ['TF_NUM_INTEROP_THREADS'] = '1'

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
        except Exception as e:
            self.hands = None
            self.has_mediapipe = False
            print(f"MediaPipe load error: {e}. Fallback logic disabled.")
            
        self.custom_model = None
        self.model_type = None
        
        # Lazy-load torch to keep startup memory under 50MB and prevent OOM on Render
        try:
            import torch
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        except Exception:
            self.device = "cpu"

    def load_custom_model(self):
        # Priority 1: PyTorch Model
        if os.path.exists(MODEL_PTH_PATH):
            try:
                import torch
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

        if os.path.exists(MODEL_KERAS_PATH):
            try:
                import tensorflow as tf
                
                # Monkey patch tf.keras.layers.Dense to safely pop quantization_config dynamically
                if not hasattr(tf.keras.layers.Dense.__init__, "_patched"):
                    original_init = tf.keras.layers.Dense.__init__
                    def patched_init(self, *args, **kwargs):
                        kwargs.pop('quantization_config', None)
                        return original_init(self, *args, **kwargs)
                    patched_init._patched = True
                    tf.keras.layers.Dense.__init__ = patched_init
                
                self.custom_model = tf.keras.models.load_model(MODEL_KERAS_PATH)
                self.model_type = 'keras'
                print(f"Loaded custom Keras Hand AI model from {MODEL_KERAS_PATH}")
                return
            except Exception as e:
                self.load_error = str(e)
                print(f"Error loading custom Keras model: {e}")

    def predict_image(self, image_path):
        import cv2
        # 1. Direct Memory Load: Eliminates loading images multiple times from disk
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            return "Invalid image", 0.0, {}

        # 2. Fast Singleton Validation: Uses our long-lived MediaPipe object instead of spawning fresh instances
        mp_results = None
        if self.has_mediapipe:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            mp_results = self.hands.process(img_rgb)
            if not mp_results.multi_hand_landmarks:
                print("Fast Validation Alert: No hand found in frame.")
                return "Not a hand (No hand detected)", 0.0, {}
        
        # 3. Highly-Optimized Keras Logic
        if self.model_type == 'keras':
            # Efficient in-memory manipulation directly to Keras float tensor
            img_resized = cv2.resize(img_bgr, (224, 224))
            img_keras_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
            img_array = np.expand_dims(img_keras_rgb, 0).astype(np.float32)
            img_array = img_array / 127.5 - 1.0 # Built-in model normalization
            
            predictions = self.custom_model(img_array, training=False)
            score = predictions[0].numpy()
            
            class_idx = int(np.argmax(score))
            confidence = float(np.max(score))
            
            prediction = CLASSES[class_idx] if class_idx < len(CLASSES) else str(class_idx)
            raw_scores = {CLASSES[i]: float(score[i]) for i in range(min(len(CLASSES), len(score)))}
            
            # --- MEMOIZED Heuristic Check for C, P, F ---
            # Zero Cost: Reuses the EXACT results computed during the validation step!
            if prediction in ['C', 'P', 'F'] and mp_results and mp_results.multi_hand_landmarks:
                lm = mp_results.multi_hand_landmarks[0].landmark
                
                thumb_index_dist = np.sqrt((lm[4].x - lm[8].x)**2 + (lm[4].y - lm[8].y)**2)
                middle_extended = lm[12].y < lm[9].y
                ring_extended = lm[16].y < lm[13].y
                pinky_extended = lm[20].y < lm[17].y
                middle_down = lm[12].y > lm[9].y
                
                if thumb_index_dist < 0.08 and middle_extended and ring_extended and pinky_extended:
                    prediction = 'F'
                elif middle_down and (not ring_extended):
                    prediction = 'P'
                elif thumb_index_dist > 0.1 and (not middle_extended):
                    prediction = 'C'

            return prediction, confidence, raw_scores

        # 4. Optimized Fallback / PyTorch Landmark logic
        if not self.has_mediapipe:
            err = getattr(self, 'load_error', 'Model failed during startup.')
            return "No ASL model loaded", 0.0, {"error": err}

        if not mp_results or not mp_results.multi_hand_landmarks:
             return "No hands detected", 0.0, {"error": "No hands detected"}

        if self.model_type == 'pytorch':
            import torch
            landmarks = []
            for lm in mp_results.multi_hand_landmarks[0].landmark:
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
    load_model_if_needed()
    if detector.model_type == 'keras':
        return "Keras/TensorFlow"
    elif detector.model_type == 'pytorch':
        return "PyTorch Hand Model"
    return f"No Model Loaded (Error: {getattr(detector, 'load_error', 'Unknown')})"
