import torch
import os
import json
from torchvision import datasets
from torch.utils.data import DataLoader
from model import get_model
from preprocess import train_transform

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "train")
SAVE_PATH = os.path.join(PROJECT_ROOT, "saved_models", "animal_model.pth")
CLASSES_PATH = os.path.join(PROJECT_ROOT, "saved_models", "classes.json")
SAVED_MODELS_DIR = os.path.join(PROJECT_ROOT, "saved_models")
EPOCHS = 7
BATCH_SIZE = 32
LEARNING_RATE = 0.001

# Ensure save directory exists
if not os.path.exists(SAVED_MODELS_DIR):
    os.makedirs(SAVED_MODELS_DIR)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Training on: {device}")

# Data Loading
try:
    # Using train_transform with Data Augmentation
    train_data = datasets.ImageFolder(DATA_DIR, transform=train_transform)
    num_classes = len(train_data.classes)
    train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
    
    # Save the classes to a JSON file
    with open(CLASSES_PATH, 'w') as f:
        json.dump(train_data.classes, f)
        
    print(f"Detected and saved classes: {train_data.classes}")
    print(f"Number of batches: {len(train_loader)}")
except Exception as e:
    print(f"Error: {e}. Ensure images are in {DATA_DIR}/<class_name>")
    exit()

# Get EfficientNet model with frozen features
model = get_model(num_classes=num_classes, pretrained=True, freeze_features=True).to(device)

criterion = torch.nn.CrossEntropyLoss()
# Only optimize the classifier parameters (since features are frozen)
optimizer = torch.optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

# Training loop
model.train()
for epoch in range(EPOCHS):
    running_loss = 0.0
    batch_count = 0
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        outputs = model(images)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        batch_count += 1
        if batch_count % 5 == 0:
             print(".", end="", flush=True)

    print(f"Epoch {epoch+1}/{EPOCHS} done. Loss: {running_loss/len(train_loader):.4f}")
    torch.save(model.state_dict(), SAVE_PATH)
    print(f"Intermediate model saved to {SAVE_PATH}")
print(f"Successfully saved model to {SAVE_PATH} and classes to {CLASSES_PATH}")
