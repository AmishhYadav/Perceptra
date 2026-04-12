---
phase: 3
plan: 1
title: "Universal Model Persistence"
wave: 1
depends_on: []
files_modified:
  - src/models/base.py
  - src/models/perceptron.py
  - src/models/svm.py
  - src/models/neural_net.py
  - src/models/amnp.py
autonomous: true
requirements: []
---

# Plan 1: Universal Model Persistence

## Goal
Implement a unified model persistence strategy by adding `save()` and `load()` methods to the `BaseModel` interface, ensuring that Phase 4 can easily restore any evaluated model regardless of its underlying framework.

## must_haves
- Abstract `save(path)` and `load(path)` methods in `BaseModel`.
- Scikit-learn models (`PerceptronModel`, `SVMModel`) implementing save/load using `joblib`.
- PyTorch models (`NeuralNetModel`, `AMNPModel`) implementing save/load using `torch.save` and `torch.load` applied to the `state_dict`.
- The models must be fully usable for `predict` and `predict_proba` immediately after `load()`.

## Tasks

<task id="3.1.1">
<title>Update BaseModel interface and Scikit-learn models</title>
<read_first>
- src/models/base.py
- src/models/perceptron.py
- src/models/svm.py
</read_first>
<action>
1. Edit `src/models/base.py` to add `@abstractmethod` for `save(self, path: str)` and `load(self, path: str)`.
2. Edit `src/models/perceptron.py` to import `joblib` and implement `save` (dumping `self._calibrated` if calibrated else `self._model`) and `load`.
3. Edit `src/models/svm.py` to import `joblib` and implement `save` (dumping `self._model`) and `load`. Include restoring `self.is_trained = True`.
</action>
<acceptance_criteria>
- `BaseModel` defines `save` and `load` methods.
- `PerceptronModel` and `SVMModel` correctly serialize and deserialize their states to disk using `joblib`.
</acceptance_criteria>
</task>

<task id="3.1.2">
<title>Update PyTorch models (NN and AMNP)</title>
<read_first>
- src/models/neural_net.py
- src/models/amnp.py
</read_first>
<action>
1. Edit `src/models/neural_net.py` to implement `save` (`torch.save(self._model.state_dict(), path)`) and `load` (`self._model.load_state_dict(torch.load(path))`).
2. Edit `src/models/amnp.py` to implement `save` (`torch.save(self._model.state_dict(), path)`) and `load` (`self._model.load_state_dict(torch.load(path))`).
3. For both PyTorch models, ensure `load()` triggers `self._model.eval()` and `self.is_trained = True`.
</action>
<acceptance_criteria>
- `NeuralNetModel` and `AMNPModel` correctly save and load their `state_dict` using `torch.save`.
</acceptance_criteria>
</task>

## Verification
```bash
source .venv/bin/activate
python -c "
import numpy as np
import os
from src.models import PerceptronModel, AMNPModel
os.makedirs('data/weights', exist_ok=True)

X = np.random.randn(10, 8).astype(np.float32)
y = np.random.randint(0, 3, 10)

p = PerceptronModel(8, 3)
p.train(X, y, epochs=1)
p.save('data/weights/perceptron.joblib')

a = AMNPModel(8, 3)
a.train(X, y, epochs=1)
a.save('data/weights/amnp.pt')

p2 = PerceptronModel(8, 3)
p2.load('data/weights/perceptron.joblib')
assert p2.is_trained

a2 = AMNPModel(8, 3)
a2.load('data/weights/amnp.pt')
assert a2.is_trained

print('Persistence Verification Passed')
"
```
