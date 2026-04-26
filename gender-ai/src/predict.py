import torch
from PIL import Image
import os
from model import get_model
from preprocess import transform

# Initialize model
model = get_model()
model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models", "gender_model.pth")

if os.path.exists(model_path):
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    print("Loaded model weights.")
else:
    print("Warning: Model weights not found. Prediction will use random initialization.")

model.eval()

classes = ["female", "male"]

def predict_image(image_path):
    img = Image.open(image_path).convert("RGB")
    img = transform(img).unsqueeze(0)

    with torch.no_grad():
        outputs = model(img)
        # Calculate probabilities using Softmax
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)

    return classes[predicted.item()], confidence.item()
