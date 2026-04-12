---
phase: 1
plan: 3
title: "AMNP Core — Neural Transformation & Adaptive Margin"
wave: 2
depends_on: ["01-PLAN-1"]
files_modified:
  - src/models/amnp.py
  - src/models/__init__.py
autonomous: true
requirements: []
---

# Plan 3: AMNP Core — Neural Transformation & Adaptive Margin

## Goal
Implement the Adaptive Multimodal Neural Perceptron as a PyTorch `nn.Module` wrapped in the BaseModel interface. The AMNP combines a neural feature transformation, an adaptive margin mechanism, and a linear decision layer.

## must_haves
- AMNP with neural feature transformation (MLP) sub-module
- Adaptive margin as a learned `nn.Parameter` that adjusts per-sample based on feature representations
- Custom AdaptiveMarginLoss as nn.Module
- Gradient clipping (max_norm=1.0) in training loop
- explain() method mapping adaptive weights to feature importance

## Tasks

<task id="1.3.1">
<title>Implement AMNP PyTorch module and AdaptiveMarginLoss</title>
<read_first>
- src/models/base.py
- src/models/neural_net.py
- src/data/schemas.py
</read_first>
<action>
Create `src/models/amnp.py`:

```python
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict
from .base import BaseModel


class AdaptiveMarginLoss(nn.Module):
    """Custom loss that incorporates the adaptive margin into a hinge-style objective."""
    
    def __init__(self, base_margin: float = 1.0):
        super().__init__()
        self.base_margin = base_margin
    
    def forward(self, logits: torch.Tensor, targets: torch.Tensor, margins: torch.Tensor) -> torch.Tensor:
        """
        Args:
            logits: (batch, n_classes) raw model output
            targets: (batch,) integer class labels
            margins: (batch,) per-sample adaptive margin values
        """
        n_classes = logits.size(1)
        one_hot = torch.zeros_like(logits).scatter_(1, targets.unsqueeze(1), 1.0)
        
        # Correct class score
        correct_scores = (logits * one_hot).sum(dim=1)
        
        # Max incorrect class score
        masked_logits = logits.clone()
        masked_logits[one_hot.bool()] = float('-inf')
        max_incorrect = masked_logits.max(dim=1).values
        
        # Hinge loss with adaptive margin
        loss = torch.clamp(margins - (correct_scores - max_incorrect), min=0.0)
        return loss.mean()


class _AMNPNetwork(nn.Module):
    """The core AMNP architecture combining transformation, margin, and decision layers."""
    
    def __init__(self, n_features: int, n_classes: int, hidden_dim: int = 48):
        super().__init__()
        
        # Feature Transformation Layer (non-linear)
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
        # Non-linear path: transform -> decide
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
    linear decision-making, margin-based learning, and non-linear feature transformation."""
    
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
```
</action>
<acceptance_criteria>
- `src/models/amnp.py` contains `class AdaptiveMarginLoss(nn.Module)`
- `src/models/amnp.py` contains `class _AMNPNetwork(nn.Module)`
- `src/models/amnp.py` contains `class AMNPModel(BaseModel)`
- `src/models/amnp.py` contains `self.margin_base = nn.Parameter(torch.tensor(1.0))`
- `src/models/amnp.py` contains `nn.Sigmoid()` in margin_net
- `src/models/amnp.py` contains `clip_grad_norm_` in train method
- `src/models/amnp.py` contains `def get_component_weights`
- `src/models/amnp.py` contains `self.alpha = nn.Parameter`
</acceptance_criteria>
</task>

<task id="1.3.2">
<title>Register AMNP in models package</title>
<read_first>
- src/models/__init__.py
</read_first>
<action>
Update `src/models/__init__.py` to include the AMNP model:

```python
from .base import BaseModel
from .perceptron import PerceptronModel
from .svm import SVMModel
from .neural_net import NeuralNetModel
from .amnp import AMNPModel
```
</action>
<acceptance_criteria>
- `src/models/__init__.py` contains `from .amnp import AMNPModel`
</acceptance_criteria>
</task>

## Verification
```bash
python -c "
from src.models import AMNPModel
import numpy as np
X = np.random.randn(100, 8).astype(np.float32)
y = np.random.randint(0, 3, 100)
m = AMNPModel(n_features=8, n_classes=3)
history = m.train(X, y, epochs=20)
print(f'Loss: {history[\"loss\"][-1]:.4f}')
print(f'Accuracy: {history[\"accuracy\"][-1]:.4f}')
print(f'Mean margin: {history[\"margin_mean\"][-1]:.4f}')
print(f'Alpha (nonlinear weight): {history[\"alpha\"][-1]:.4f}')
preds = m.predict(X)
proba = m.predict_proba(X)
expl = m.explain(X)
print(f'Predictions shape: {preds.shape}')
print(f'Probabilities shape: {proba.shape}')
print(f'Component weights: {expl[\"component_weights\"]}')
# Check margin is not stuck at initialization
assert history['margin_mean'][0] != history['margin_mean'][-1], 'Margin did not update!'
print('AMNP verification passed!')
"
```
