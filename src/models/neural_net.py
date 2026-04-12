"""Neural Network model implemented in PyTorch with BaseModel interface."""
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict
from .base import BaseModel


class _MLP(nn.Module):
    """3-layer MLP: input → 64 → 32 → n_classes with batch norm and dropout."""

    def __init__(self, n_features: int, n_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_features, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class NeuralNetModel(BaseModel):
    """PyTorch MLP wrapped in the Perceptra BaseModel interface.

    Uses CrossEntropyLoss, Adam optimizer, and input gradient saliency for explain().
    """

    def __init__(self, n_features: int, n_classes: int):
        super().__init__(name="NeuralNetwork", n_features=n_features, n_classes=n_classes)
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model = _MLP(n_features, n_classes).to(self._device)
        self._criterion = nn.CrossEntropyLoss()

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 1e-3) -> Dict:
        self._model.train()
        optimizer = optim.Adam(self._model.parameters(), lr=lr)
        X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
        y_t = torch.tensor(y, dtype=torch.long).to(self._device)

        history = {"loss": [], "accuracy": []}

        for epoch in range(epochs):
            optimizer.zero_grad()
            logits = self._model(X_t)
            loss = self._criterion(logits, y_t)
            loss.backward()
            optimizer.step()

            preds = logits.argmax(dim=1).cpu().numpy()
            acc = float(np.mean(preds == y))
            history["loss"].append(float(loss.item()))
            history["accuracy"].append(acc)

        self.is_trained = True
        self.training_history = history
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits = self._model(X_t)
            return logits.argmax(dim=1).cpu().numpy()

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits = self._model(X_t)
            probs = torch.softmax(logits, dim=1)
            return probs.cpu().numpy()

    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Input gradient saliency — backpropagate from predicted class to input features."""
        self._model.eval()
        X_t = torch.tensor(X, dtype=torch.float32, requires_grad=True).to(self._device)
        logits = self._model(X_t)
        predicted_classes = logits.argmax(dim=1)
        selected_logits = logits[torch.arange(len(predicted_classes)), predicted_classes]
        selected_logits.sum().backward()

        gradients = X_t.grad.cpu().numpy()
        importance = np.mean(np.abs(gradients), axis=0)
        return {"feature_importance": importance}
