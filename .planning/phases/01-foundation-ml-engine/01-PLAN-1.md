---
phase: 1
plan: 1
title: "ML Architecture Interfaces & Data Schemas"
wave: 1
depends_on: []
files_modified:
  - src/models/__init__.py
  - src/models/base.py
  - src/data/__init__.py
  - src/data/preprocessing.py
  - src/data/schemas.py
  - src/utils/__init__.py
  - src/utils/metrics.py
  - src/__init__.py
  - requirements.txt
autonomous: true
requirements: []
---

# Plan 1: ML Architecture Interfaces & Data Schemas

## Goal
Establish the project skeleton, Python package structure, BaseModel abstract class, data preprocessing pipeline, and shared utilities. This is the foundation that all subsequent plans depend on.

## must_haves
- BaseModel ABC with enforced `train()`, `predict()`, `predict_proba()`, `explain()` signatures
- Data preprocessing module that converts raw feature dicts into normalized NumPy arrays
- Requirements file with pinned dependencies (PyTorch, scikit-learn, NumPy, pandas)
- Metrics utility module with accuracy, precision, recall, F1 helpers

## Tasks

<task id="1.1.1">
<title>Initialize Python package structure and dependencies</title>
<read_first>
- requirements.txt (if exists)
</read_first>
<action>
Create the following directory structure and files:

```
src/
├── __init__.py
├── models/
│   └── __init__.py
├── data/
│   └── __init__.py
├── training/
│   └── __init__.py
└── utils/
    └── __init__.py
```

Create `requirements.txt` with these pinned dependencies:
```
torch>=2.0.0
scikit-learn>=1.3.0
numpy>=1.24.0
pandas>=2.0.0
```

All `__init__.py` files should be empty initially except `src/__init__.py` which should contain:
```python
"""Perceptra — AI-powered behavioral intelligence system."""
__version__ = "0.1.0"
```
</action>
<acceptance_criteria>
- `src/__init__.py` contains `__version__ = "0.1.0"`
- `src/models/__init__.py` exists and is importable
- `src/data/__init__.py` exists and is importable
- `src/training/__init__.py` exists and is importable
- `src/utils/__init__.py` exists and is importable
- `requirements.txt` contains `torch>=2.0.0`
- `requirements.txt` contains `scikit-learn>=1.3.0`
- `requirements.txt` contains `numpy>=1.24.0`
</acceptance_criteria>
</task>

<task id="1.1.2">
<title>Implement BaseModel abstract class</title>
<read_first>
- src/models/__init__.py
</read_first>
<action>
Create `src/models/base.py` with an abstract base class:

```python
from abc import ABC, abstractmethod
import numpy as np
from typing import Dict, Optional

class BaseModel(ABC):
    """Abstract base class for all Perceptra models."""
    
    def __init__(self, name: str, n_features: int, n_classes: int):
        self.name = name
        self.n_features = n_features
        self.n_classes = n_classes
        self.is_trained = False
        self.training_history: list = []
    
    @abstractmethod
    def train(self, X: np.ndarray, y: np.ndarray, epochs: int = 100, lr: float = 0.01) -> Dict:
        """Train the model. Returns training history dict with keys: loss, accuracy per epoch."""
        pass
    
    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return predicted class labels as shape (n_samples,)."""
        pass
    
    @abstractmethod
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return class probabilities as shape (n_samples, n_classes)."""
        pass
    
    @abstractmethod
    def explain(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Return feature importance scores. Keys are feature names, values are importance arrays."""
        pass
    
    def get_params(self) -> Dict:
        """Return model parameters for serialization."""
        return {"name": self.name, "n_features": self.n_features, "n_classes": self.n_classes}
```

Update `src/models/__init__.py` to export:
```python
from .base import BaseModel
```
</action>
<acceptance_criteria>
- `src/models/base.py` contains `class BaseModel(ABC)`
- `src/models/base.py` contains `@abstractmethod` decorator on `train`, `predict`, `predict_proba`, `explain`
- `src/models/base.py` contains `def __init__(self, name: str, n_features: int, n_classes: int)`
- `src/models/__init__.py` contains `from .base import BaseModel`
</acceptance_criteria>
</task>

<task id="1.1.3">
<title>Implement data preprocessing and schema modules</title>
<read_first>
- src/models/base.py
</read_first>
<action>
Create `src/data/schemas.py` defining the feature vector schema:

```python
from dataclasses import dataclass, field
from typing import List

FEATURE_NAMES: List[str] = [
    "click_frequency",
    "hesitation_time",
    "misclick_rate", 
    "scroll_depth",
    "movement_smoothness",
    "dwell_time",
    "navigation_speed",
    "direction_changes",
]

BEHAVIOR_CLASSES: List[str] = ["focused", "distracted", "confused"]

N_FEATURES = len(FEATURE_NAMES)
N_CLASSES = len(BEHAVIOR_CLASSES)

@dataclass
class PredictionResult:
    predicted_class: str
    confidence: float
    class_probabilities: dict
    feature_contributions: dict
```

Create `src/data/preprocessing.py`:

```python
import numpy as np
from typing import List, Dict, Optional
from .schemas import FEATURE_NAMES, N_FEATURES

class FeaturePreprocessor:
    """Normalizes raw telemetry into fixed-size feature vectors."""
    
    def __init__(self):
        self.mean_: Optional[np.ndarray] = None
        self.std_: Optional[np.ndarray] = None
        self.is_fitted = False
    
    def fit(self, X: np.ndarray) -> 'FeaturePreprocessor':
        self.mean_ = np.mean(X, axis=0)
        self.std_ = np.std(X, axis=0) + 1e-8
        self.is_fitted = True
        return self
    
    def transform(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("FeaturePreprocessor must be fitted before transform")
        return (X - self.mean_) / self.std_
    
    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        return self.fit(X).transform(X)
    
    @staticmethod
    def from_raw_json(records: List[Dict]) -> np.ndarray:
        vectors = []
        for record in records:
            vec = [record.get(name, 0.0) for name in FEATURE_NAMES]
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)
```

Update `src/data/__init__.py`:
```python
from .schemas import FEATURE_NAMES, BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES, PredictionResult
from .preprocessing import FeaturePreprocessor
```
</action>
<acceptance_criteria>
- `src/data/schemas.py` contains `FEATURE_NAMES` with exactly 8 feature names
- `src/data/schemas.py` contains `BEHAVIOR_CLASSES = ["focused", "distracted", "confused"]`
- `src/data/schemas.py` contains `class PredictionResult`
- `src/data/preprocessing.py` contains `class FeaturePreprocessor`
- `src/data/preprocessing.py` contains `def fit_transform(self, X`
- `src/data/preprocessing.py` contains `def from_raw_json(records`
- `src/data/__init__.py` contains `from .preprocessing import FeaturePreprocessor`
</acceptance_criteria>
</task>

<task id="1.1.4">
<title>Implement metrics utility module</title>
<read_first>
- src/utils/__init__.py
</read_first>
<action>
Create `src/utils/metrics.py`:

```python
import numpy as np
from typing import Dict

def accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return np.mean(y_true == y_pred)

def precision_per_class(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    precisions = np.zeros(n_classes)
    for c in range(n_classes):
        tp = np.sum((y_pred == c) & (y_true == c))
        fp = np.sum((y_pred == c) & (y_true != c))
        precisions[c] = tp / (tp + fp + 1e-8)
    return precisions

def recall_per_class(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    recalls = np.zeros(n_classes)
    for c in range(n_classes):
        tp = np.sum((y_pred == c) & (y_true == c))
        fn = np.sum((y_pred != c) & (y_true == c))
        recalls[c] = tp / (tp + fn + 1e-8)
    return recalls

def f1_per_class(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> np.ndarray:
    p = precision_per_class(y_true, y_pred, n_classes)
    r = recall_per_class(y_true, y_pred, n_classes)
    return 2 * (p * r) / (p + r + 1e-8)

def compute_all_metrics(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> Dict:
    return {
        "accuracy": float(accuracy(y_true, y_pred)),
        "precision": precision_per_class(y_true, y_pred, n_classes).tolist(),
        "recall": recall_per_class(y_true, y_pred, n_classes).tolist(),
        "f1": f1_per_class(y_true, y_pred, n_classes).tolist(),
    }
```

Update `src/utils/__init__.py`:
```python
from .metrics import compute_all_metrics, accuracy, f1_per_class
```
</action>
<acceptance_criteria>
- `src/utils/metrics.py` contains `def accuracy(y_true`
- `src/utils/metrics.py` contains `def precision_per_class(`
- `src/utils/metrics.py` contains `def recall_per_class(`
- `src/utils/metrics.py` contains `def f1_per_class(`
- `src/utils/metrics.py` contains `def compute_all_metrics(`
- `src/utils/__init__.py` contains `from .metrics import compute_all_metrics`
</acceptance_criteria>
</task>

## Verification
```bash
python -c "from src.models import BaseModel; print('BaseModel imported')"
python -c "from src.data import FeaturePreprocessor, FEATURE_NAMES; print(f'{len(FEATURE_NAMES)} features')"
python -c "from src.utils import compute_all_metrics; print('Metrics imported')"
```
