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
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)

        # Internal validation split (80/20) for early stopping
        n = len(X)
        if n >= 100:
            n_val = max(int(n * 0.2), 10)
            indices = np.random.permutation(n)
            X_train_np, X_val_np = X[indices[n_val:]], X[indices[:n_val]]
            y_train_np, y_val_np = y[indices[n_val:]], y[indices[:n_val]]
        else:
            X_train_np, X_val_np = X, X
            y_train_np, y_val_np = y, y

        X_t = torch.tensor(X_train_np, dtype=torch.float32).to(self._device)
        y_t = torch.tensor(y_train_np, dtype=torch.long).to(self._device)
        X_v = torch.tensor(X_val_np, dtype=torch.float32).to(self._device)
        y_v = torch.tensor(y_val_np, dtype=torch.long).to(self._device)

        history = {"loss": [], "accuracy": [], "val_loss": [], "lr": []}

        # Early stopping state
        best_val_loss = float("inf")
        best_state = None
        patience_counter = 0
        patience = 10

        for epoch in range(epochs):
            self._model.train()
            optimizer.zero_grad()
            logits = self._model(X_t)
            loss = self._criterion(logits, y_t)
            loss.backward()
            optimizer.step()

            preds = logits.argmax(dim=1).cpu().numpy()
            acc = float(np.mean(preds == y_train_np))

            # Validation loss
            self._model.eval()
            with torch.no_grad():
                val_logits = self._model(X_v)
                val_loss = self._criterion(val_logits, y_v).item()

            scheduler.step(val_loss)

            history["loss"].append(float(loss.item()))
            history["accuracy"].append(acc)
            history["val_loss"].append(val_loss)
            history["lr"].append(optimizer.param_groups[0]["lr"])

            # Early stopping check
            if val_loss < best_val_loss - 1e-4:
                best_val_loss = val_loss
                best_state = {k: v.clone() for k, v in self._model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break

        # Restore best weights
        if best_state is not None:
            self._model.load_state_dict(best_state)

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

    def save(self, path: str) -> None:
        torch.save(self._model.state_dict(), path)

    def load(self, path: str) -> None:
        self._model.load_state_dict(torch.load(path, map_location=self._device, weights_only=True))
        self._model.eval()
        self.is_trained = True

