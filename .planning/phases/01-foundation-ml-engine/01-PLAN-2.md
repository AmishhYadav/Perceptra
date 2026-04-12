---
phase: 1
plan: 2
title: "Baseline Models — Perceptron, SVM, Neural Network"
wave: 2
depends_on: ["01-PLAN-1"]
files_modified:
  - src/models/perceptron.py
  - src/models/svm.py
  - src/models/neural_net.py
  - src/models/__init__.py
autonomous: true
requirements: []
---

# Plan 2: Baseline Models — Perceptron, SVM, Neural Network

## Goal
Implement the three baseline models, each wrapping their respective framework (scikit-learn or PyTorch) behind the BaseModel interface. All three must pass the same interface compliance tests.

## must_haves
- PerceptronModel wrapping sklearn.linear_model.Perceptron with train/predict/predict_proba/explain
- SVMModel wrapping sklearn.svm.SVC with probability=True
- NeuralNetModel implemented in PyTorch with 3-layer MLP
- All models export from src/models/__init__.py

## Tasks

<task id="1.2.1">
<title>Implement PerceptronModel</title>
<read_first>
- src/models/base.py
- src/data/schemas.py
</read_first>
<action>
Create `src/models/perceptron.py`:

```python
import numpy as np
from sklearn.linear_model import Perceptron
from sklearn.calibration import CalibratedClassifierCV
from typing import Dict
from .base import BaseModel

class PerceptronModel(BaseModel):
    def __init__(self, n_features: int, n_classes: int):
        super().__init__(name="Perceptron", n_features=n_features, n_classes=n_classes)
        self._model = Perceptron(max_iter=1, warm_start=True, tol=None)
        self._calibrated = None
    
    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 0.01) -> Dict:
        self._model.eta0 = lr
        history = {"loss": [], "accuracy": []}
        for epoch in range(epochs):
            self._model.max_iter = 1
            self._model.fit(X, y)
            preds = self._model.predict(X)
            acc = np.mean(preds == y)
            # Hinge-like loss approximation
            decision = self._model.decision_function(X)
            if decision.ndim == 1:
                loss = float(np.mean(np.maximum(0, 1 - y * decision)))
            else:
                loss = float(np.mean(np.maximum(0, 1 - decision[np.arange(len(y)), y])))
            history["loss"].append(loss)
            history["accuracy"].append(float(acc))
        # Calibrate for probability estimates
        self._calibrated = CalibratedClassifierCV(self._model, cv=3, method='sigmoid')
        self._calibrated.fit(X, y)
        self.is_trained = True
        self.training_history = history
        return history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        return self._model.predict(X)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        if self._calibrated is not None:
            return self._calibrated.predict_proba(X)
        n = X.shape[0]
        proba = np.zeros((n, self.n_classes))
        preds = self.predict(X)
        proba[np.arange(n), preds] = 1.0
        return proba
    
    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        coefs = self._model.coef_
        if coefs.ndim == 2:
            importance = np.mean(np.abs(coefs), axis=0)
        else:
            importance = np.abs(coefs)
        return {"feature_importance": importance}
```
</action>
<acceptance_criteria>
- `src/models/perceptron.py` contains `class PerceptronModel(BaseModel)`
- `src/models/perceptron.py` contains `def train(self, X: np.ndarray, y: np.ndarray`
- `src/models/perceptron.py` contains `def predict_proba(self, X`
- `src/models/perceptron.py` contains `def explain(self, X`
- `src/models/perceptron.py` contains `CalibratedClassifierCV`
</acceptance_criteria>
</task>

<task id="1.2.2">
<title>Implement SVMModel</title>
<read_first>
- src/models/base.py
- src/data/schemas.py
</read_first>
<action>
Create `src/models/svm.py`:

```python
import numpy as np
from sklearn.svm import SVC
from sklearn.inspection import permutation_importance
from typing import Dict
from .base import BaseModel

class SVMModel(BaseModel):
    def __init__(self, n_features: int, n_classes: int, kernel: str = 'rbf'):
        super().__init__(name="SVM", n_features=n_features, n_classes=n_classes)
        self._model = SVC(kernel=kernel, probability=True, max_iter=1000)
        self._X_train = None
        self._y_train = None
    
    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 0.01) -> Dict:
        # SVM doesn't have epochs — train once. Track convergence via score.
        self._model.max_iter = epochs * 10
        self._model.fit(X, y)
        self._X_train = X
        self._y_train = y
        preds = self._model.predict(X)
        acc = float(np.mean(preds == y))
        self.is_trained = True
        history = {"loss": [1.0 - acc], "accuracy": [acc]}
        self.training_history = history
        return history
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        return self._model.predict(X)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self._model.predict_proba(X)
    
    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        if self._X_train is not None and self._y_train is not None:
            result = permutation_importance(
                self._model, self._X_train, self._y_train,
                n_repeats=10, random_state=42, n_jobs=-1
            )
            return {"feature_importance": result.importances_mean}
        return {"feature_importance": np.zeros(self.n_features)}
```
</action>
<acceptance_criteria>
- `src/models/svm.py` contains `class SVMModel(BaseModel)`
- `src/models/svm.py` contains `SVC(kernel=kernel, probability=True`
- `src/models/svm.py` contains `permutation_importance`
- `src/models/svm.py` contains `def predict_proba(self, X`
</acceptance_criteria>
</task>

<task id="1.2.3">
<title>Implement NeuralNetModel in PyTorch</title>
<read_first>
- src/models/base.py
- src/data/schemas.py
</read_first>
<action>
Create `src/models/neural_net.py`:

```python
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict
from .base import BaseModel

class _MLP(nn.Module):
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
        self._model.eval()
        X_t = torch.tensor(X, dtype=torch.float32, requires_grad=True).to(self._device)
        logits = self._model(X_t)
        predicted_classes = logits.argmax(dim=1)
        selected_logits = logits[torch.arange(len(predicted_classes)), predicted_classes]
        selected_logits.sum().backward()
        gradients = X_t.grad.cpu().numpy()
        importance = np.mean(np.abs(gradients), axis=0)
        return {"feature_importance": importance}
```
</action>
<acceptance_criteria>
- `src/models/neural_net.py` contains `class _MLP(nn.Module)`
- `src/models/neural_net.py` contains `class NeuralNetModel(BaseModel)`
- `src/models/neural_net.py` contains `nn.BatchNorm1d`
- `src/models/neural_net.py` contains `nn.Dropout(0.3)`
- `src/models/neural_net.py` contains `torch.softmax(logits, dim=1)` in `predict_proba`
- `src/models/neural_net.py` contains `requires_grad=True` in `explain`
</acceptance_criteria>
</task>

<task id="1.2.4">
<title>Update models __init__.py exports</title>
<read_first>
- src/models/__init__.py
</read_first>
<action>
Update `src/models/__init__.py` to export all model classes:

```python
from .base import BaseModel
from .perceptron import PerceptronModel
from .svm import SVMModel
from .neural_net import NeuralNetModel
```
</action>
<acceptance_criteria>
- `src/models/__init__.py` contains `from .perceptron import PerceptronModel`
- `src/models/__init__.py` contains `from .svm import SVMModel`
- `src/models/__init__.py` contains `from .neural_net import NeuralNetModel`
</acceptance_criteria>
</task>

## Verification
```bash
python -c "
from src.models import PerceptronModel, SVMModel, NeuralNetModel
import numpy as np
X = np.random.randn(100, 8).astype(np.float32)
y = np.random.randint(0, 3, 100)
for ModelClass in [PerceptronModel, SVMModel, NeuralNetModel]:
    m = ModelClass(n_features=8, n_classes=3)
    m.train(X, y, epochs=10)
    preds = m.predict(X)
    proba = m.predict_proba(X)
    expl = m.explain(X)
    print(f'{m.name}: preds={preds.shape}, proba={proba.shape}, importance={expl[\"feature_importance\"].shape}')
"
```
