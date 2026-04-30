import torch.nn as nn
from torchvision import models

def get_model(pretrained=True):
    # If pretrained=True, it downloads weights (used for training)
    # If pretrained=False, it starts empty (used for prediction/loading your .pth)
    if pretrained:
        model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    else:
        model = models.resnet18(weights=None)

    # Replace final layer for binary classification (male/female)
    model.fc = nn.Linear(model.fc.in_features, 2)

    return model
