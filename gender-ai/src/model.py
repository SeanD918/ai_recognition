import torch.nn as nn
from torchvision import models

def get_model():
    # Using ResNet18 with pretrained weights
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)

    # Replace final layer for binary classification (male/female)
    model.fc = nn.Linear(model.fc.in_features, 2)

    return model
