---
phase: 3
plan: 2
title: "Mathematical Guards for PyTorch Models"
wave: 2
depends_on: ["03-PLAN-1"]
files_modified:
  - src/models/neural_net.py
  - src/models/amnp.py
  - src/training/trainer.py
autonomous: true
requirements: []
---

# Plan 2: Mathematical Guards for PyTorch Models

## Goal
Stabilize training and prevent gradient collapse in the AMNP (and NN) by implementing Early Stopping and Learning Rate Scheduling based on a validation split.

## must_haves
- Training loop in `NeuralNetModel` and `AMNPModel` must split 20% of the training data as an internal validation set.
- Implement an EarlyStopping mechanism (patience = 10 epochs).
- Implement `torch.optim.lr_scheduler.ReduceLROnPlateau` in the PyTorch training loops to gracefully step down LR before early stopping.
- Best weights recovered upon early stopping instead of last epoch's weights.

## Tasks

<task id="3.2.1">
<title>Add EarlyStopping and Internal Validation to PyTorch Models</title>
<read_first>
- src/models/amnp.py
- src/models/neural_net.py
</read_first>
<action>
1. Update `AMNPModel` and `NeuralNetModel` `train()` methods to automatically split `X` and `y` into `X_train, X_val` (e.g. 80/20) for internal tracking, unless a small dataset triggers a fallback (e.g., skip validation if len(X) < 100).
2. Inside the PyTorch loops, calculate `val_loss`.
3. Add a simple custom early stopping check (keep track of best `val_loss` and best `state_dict`, increment patience counter if `val_loss` does not improve). Load the best `state_dict` back into `self._model` at the end of training.
</action>
<acceptance_criteria>
- `AMNPModel.train()` and `NeuralNetModel.train()` calculate `val_loss`.
- `val_loss` triggers early stopping out of the training loop if it does not improve for a set number of epochs.
- The best weights are restored after the loop terminates.
</acceptance_criteria>
</task>

<task id="3.2.2">
<title>Add Learning Rate Scheduling</title>
<read_first>
- src/models/amnp.py
- src/models/neural_net.py
</read_first>
<action>
1. In both PyTorch models' `train()` method, initialize `scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)`.
2. After epoch validation calculations, `scheduler.step(val_loss)`.
</action>
<acceptance_criteria>
- `ReduceLROnPlateau` correctly steps down learning rate when `val_loss` stalls.
- Modifies `.train()` method histories to log `lr` or `val_loss`.
</acceptance_criteria>
</task>

## Verification
```bash
source .venv/bin/activate
python -c "
import numpy as np
from src.models import AMNPModel

X = np.random.randn(500, 8).astype(np.float32)
y = np.random.randint(0, 3, 500)

a = AMNPModel(8, 3)
history = a.train(X, y, epochs=100) # Should trigger early stopping well before 100

assert len(history['loss']) < 100, 'Failed to early stop'
assert 'val_loss' in history, 'val_loss not logged'

print('PyTorch Guards Validation Passed')
"
```
