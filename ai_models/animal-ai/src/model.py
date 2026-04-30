import torch.nn as nn
from torchvision import models

def get_model(num_classes=4, pretrained=True, freeze_features=True):
    # EfficientNet-B0 is more efficient and accurate than ResNet18
    if pretrained:
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    else:
        model = models.efficientnet_b0(weights=None)

    # Transfer Learning: Freeze feature extractor layers
    if pretrained and freeze_features:
        for param in model.parameters():
            param.requires_grad = False

    # Replace the classifier head
    # EfficientNet has a 'classifier' attribute instead of 'fc'
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, num_classes)
    )

    return model
