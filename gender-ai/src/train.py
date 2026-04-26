import torch
import os
from torchvision import datasets
from torch.utils.data import DataLoader
from model import get_model
from preprocess import transform

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "train")
SAVE_PATH = os.path.join(PROJECT_ROOT, "saved_models", "gender_model.pth")
SAVED_MODELS_DIR = os.path.join(PROJECT_ROOT, "saved_models")

# Ensure save directory exists
if not os.path.exists(SAVED_MODELS_DIR):
    os.makedirs(SAVED_MODELS_DIR)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Training on: {device}")

# Data Loading
try:
    train_data = datasets.ImageFolder(DATA_DIR, transform=transform)
    train_loader = DataLoader(train_data, batch_size=32, shuffle=True)
except Exception as e:
    print(f"Error: {e}. Ensure images are in {DATA_DIR}/male and {DATA_DIR}/female")
    exit()

model = get_model().to(device)

criterion = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# Training loop
for epoch in range(5):
    running_loss = 0.0
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        outputs = model(images)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()

    print(f"Epoch {epoch+1} done. Loss: {running_loss/len(train_loader):.4f}")

torch.save(model.state_dict(), SAVE_PATH)
print(f"Successfully saved model to {SAVE_PATH}")

