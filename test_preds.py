import numpy as np
import torch
import sys
from pathlib import Path

# Add project root to path
sys.path.append("/Users/amish/Perceptra")

from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel
from src.api.visualization import _load_pca_data
from src.data.schemas import BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES

try:
    X_sub, y_sub, X_2d, pca = _load_pca_data()
    print("Classes in y_sub:", np.unique(y_sub, return_counts=True))
    
    # Test AMNP with 1 epoch loop x 10 times
    print("\nAMNP Training Test:")
    model = AMNPModel(n_features=N_FEATURES, n_classes=N_CLASSES)
    for i in range(10):
        model.train(X_sub, y_sub, epochs=1, lr=1e-3)
        preds = model.predict(X_sub)
        print(f"Step {i+1} unique predictions:", np.unique(preds, return_counts=True))

    print("\nSVM Training Test (incremental n_use):")
    model = SVMModel(n_features=N_FEATURES, n_classes=N_CLASSES)
    steps = 20
    for step in range(1, steps + 1):
        frac = step / steps
        n_use = max(20, int(len(X_sub) * frac))
        model = SVMModel(n_features=N_FEATURES, n_classes=N_CLASSES)
        model.train(X_sub[:n_use], y_sub[:n_use], epochs=100, lr=0.01)
        preds = model.predict(X_sub)
        print(f"Step {step} (n={n_use}) unique:", np.unique(preds, return_counts=True))
        
except Exception as e:
    print("Error:", e)
