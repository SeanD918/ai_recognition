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
SAVE_PATH = os.path.join(PROJECT_ROOT, "saved_models", "plant_model.pth")
CLASSES_PATH = os.path.join(PROJECT_ROOT, "saved_models", "classes.json")
EPOCHS = 10
BATCH_SIZE = 16
LEARNING_RATE = 0.001

def train():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on: {device}")

    # Data Loading
    try:
        train_data = datasets.ImageFolder(DATA_DIR, transform=train_transform)
        num_classes = len(train_data.classes)
        train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
        
        # Save the classes
        with open(CLASSES_PATH, 'w') as f:
            json.dump(train_data.classes, f)
            
        print(f"Classes: {train_data.classes}")
    except Exception as e:
        print(f"Error: {e}. Please add plant images to {DATA_DIR}")
        return

    # Model
    model = get_model(num_classes=num_classes, pretrained=True).to(device)
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)

    # Loop
    model.train()
    for epoch in range(EPOCHS):
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
        
        print(f"Epoch {epoch+1}/{EPOCHS} Loss: {running_loss/len(train_loader):.4f}")
        torch.save(model.state_dict(), SAVE_PATH)

    print(f"Saved to {SAVE_PATH}")

if __name__ == "__main__":
    train()
