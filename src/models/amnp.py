"""Adaptive Multimodal Neural Perceptron (AMNP) — Perceptra's novel hybrid model.

Combines:
- Linear decision-making (Perceptron path)
- Margin-based learning (adaptive hinge loss)
- Non-linear feature transformation (neural network path)
- Dynamic weighting between linear and non-linear branches
"""
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict
from .base import BaseModel


class AdaptiveMarginLoss(nn.Module):
    """Custom loss incorporating per-sample adaptive margins into a hinge-style objective.

    The margin is not fixed — it is produced by a learned sub-network and varies
    per sample based on the transformed feature representation.
    """

    def __init__(self, base_margin: float = 1.0):
        super().__init__()
        self.base_margin = base_margin

    def forward(
        self, logits: torch.Tensor, targets: torch.Tensor, margins: torch.Tensor
    ) -> torch.Tensor:
        """Compute adaptive margin hinge loss.

        Args:
            logits: (batch, n_classes) raw model output.
            targets: (batch,) integer class labels.
            margins: (batch,) per-sample adaptive margin values.

        Returns:
            Scalar loss value.
        """
        one_hot = torch.zeros_like(logits).scatter_(1, targets.unsqueeze(1), 1.0)

        # Score for the correct class
        correct_scores = (logits * one_hot).sum(dim=1)

        # Highest score among incorrect classes
        masked_logits = logits.clone()
        masked_logits[one_hot.bool()] = float("-inf")
        max_incorrect = masked_logits.max(dim=1).values

        # Hinge loss: penalize when margin between correct and best-incorrect is too small
        loss = torch.clamp(margins - (correct_scores - max_incorrect), min=0.0)
        return loss.mean()


class _AMNPNetwork(nn.Module):
    """The core AMNP architecture combining transformation, margin, and decision layers.

    Architecture:
        Input → [Feature Transform (MLP)] → transformed_features
                                          ↳ [Margin Net] → per-sample margins
                                          ↳ [Decision Layer] → non-linear logits
        Input → [Linear Path] → linear logits
        Combined = α * non-linear + (1-α) * linear
    """

    def __init__(self, n_features: int, n_classes: int, hidden_dim: int = 48):
        super().__init__()

        # Feature Transformation Layer (non-linear path)
        self.transform = nn.Sequential(
            nn.Linear(n_features, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
        )

        # Adaptive Margin Layer — produces per-sample margin adjustments
        self.margin_base = nn.Parameter(torch.tensor(1.0))
        self.margin_net = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),  # bounds adjustment to [0, 1]
        )

        # Decision Layer (linear classification on transformed features)
        self.decision = nn.Linear(hidden_dim, n_classes)

        # Dynamic weighting between linear and non-linear paths
        self.alpha = nn.Parameter(torch.tensor(0.5))

        # Linear path (perceptron-style direct classification)
        self.linear_path = nn.Linear(n_features, n_classes)

    def forward(self, x: torch.Tensor) -> tuple:
        """Forward pass returning logits, margins, and transformed features.

        Returns:
            Tuple of (combined_logits, margins, transformed_features).
        """
        # Non-linear path: transform → decide
        transformed = self.transform(x)
        nonlinear_logits = self.decision(transformed)

        # Linear path: direct classification
        linear_logits = self.linear_path(x)

        # Dynamic weighting (alpha bounded by sigmoid)
        weight = torch.sigmoid(self.alpha)
        combined_logits = weight * nonlinear_logits + (1 - weight) * linear_logits

        # Adaptive margin computation
        margin_adjustment = self.margin_net(transformed).squeeze(-1)
        margins = self.margin_base + margin_adjustment

        return combined_logits, margins, transformed

    def get_component_weights(self) -> Dict[str, float]:
        """Return the current dynamic weighting between linear and non-linear paths."""
        weight = torch.sigmoid(self.alpha).item()
        return {"nonlinear_weight": weight, "linear_weight": 1.0 - weight}


class AMNPModel(BaseModel):
    """Adaptive Multimodal Neural Perceptron — hybrid model combining
    linear decision-making, margin-based learning, and non-linear feature transformation.

    This is Perceptra's core innovation. The model dynamically balances between
    a simple linear classifier and a deep feature transformer, while learning
    per-sample adaptive margins that adjust the decision boundary based on
    input complexity.
    """

    def __init__(self, n_features: int, n_classes: int, hidden_dim: int = 48):
        super().__init__(name="AMNP", n_features=n_features, n_classes=n_classes)
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model = _AMNPNetwork(n_features, n_classes, hidden_dim).to(self._device)
        self._criterion = AdaptiveMarginLoss(base_margin=1.0)
        self._hidden_dim = hidden_dim

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 1e-3) -> Dict:
        self._model.train()
        optimizer = optim.Adam(self._model.parameters(), lr=lr, weight_decay=1e-4)
        X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
        y_t = torch.tensor(y, dtype=torch.long).to(self._device)

        history = {"loss": [], "accuracy": [], "margin_mean": [], "alpha": []}

        for epoch in range(epochs):
            optimizer.zero_grad()
            logits, margins, _ = self._model(X_t)
            loss = self._criterion(logits, y_t, margins)
            loss.backward()

            # Critical: gradient clipping to prevent explosion
            torch.nn.utils.clip_grad_norm_(self._model.parameters(), max_norm=1.0)

            optimizer.step()

            preds = logits.argmax(dim=1).cpu().numpy()
            acc = float(np.mean(preds == y))
            weights = self._model.get_component_weights()

            history["loss"].append(float(loss.item()))
            history["accuracy"].append(acc)
            history["margin_mean"].append(float(margins.mean().item()))
            history["alpha"].append(weights["nonlinear_weight"])

        self.is_trained = True
        self.training_history = history
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits, _, _ = self._model(X_t)
            return logits.argmax(dim=1).cpu().numpy()

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        self._model.eval()
        with torch.no_grad():
            X_t = torch.tensor(X, dtype=torch.float32).to(self._device)
            logits, _, _ = self._model(X_t)
            return torch.softmax(logits, dim=1).cpu().numpy()

    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Gradient saliency plus AMNP-specific component weights and margin info."""
        self._model.eval()
        X_t = torch.tensor(X, dtype=torch.float32, requires_grad=True).to(self._device)
        logits, margins, transformed = self._model(X_t)
        predicted = logits.argmax(dim=1)
        selected = logits[torch.arange(len(predicted)), predicted]
        selected.sum().backward()

        gradients = X_t.grad.cpu().numpy()
        importance = np.mean(np.abs(gradients), axis=0)

        component_weights = self._model.get_component_weights()

        return {
            "feature_importance": importance,
            "component_weights": component_weights,
            "mean_margin": float(margins.mean().item()),
        }
