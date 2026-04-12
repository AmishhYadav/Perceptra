---
phase: 2
plan: 2
title: "Dataset Persistence & Metadata"
wave: 2
depends_on: ["02-PLAN-1"]
files_modified:
  - src/data/dataset.py
  - src/data/__init__.py
autonomous: true
requirements: []
---

# Plan 2: Dataset Persistence & Metadata

## Goal
Build the `DatasetManager` that saves generated datasets to disk as `.npy` files with an 80/20 train-test split, writes metadata JSON for reproducibility, and loads datasets back for training.

## must_haves
- Save X_train, X_test, y_train, y_test as `.npy` to `data/synthetic/`
- Save `metadata.json` with generation params, class counts, and feature stats
- Load function to restore dataset from disk
- Script entrypoint `generate_dataset.py` at project root

## Tasks

<task id="2.2.1">
<title>Implement DatasetManager for persistence and loading</title>
<read_first>
- src/data/generator.py
- src/data/schemas.py
</read_first>
<action>
Create `src/data/dataset.py`:

```python
"""Dataset persistence and loading utilities for Perceptra."""
import numpy as np
import json
import os
from pathlib import Path
from typing import Tuple, Dict, Optional
from .generator import BehavioralDataGenerator
from .preprocessing import FeaturePreprocessor
from .schemas import FEATURE_NAMES, BEHAVIOR_CLASSES, N_CLASSES


DEFAULT_DATA_DIR = Path("data/synthetic")


class DatasetManager:
    """Handles generating, saving, loading, and preprocessing the synthetic dataset."""

    def __init__(self, data_dir: Path = DEFAULT_DATA_DIR):
        self.data_dir = Path(data_dir)
        self.preprocessor = FeaturePreprocessor()

    def generate_and_save(
        self,
        n_samples: int = 15000,
        noise_std: float = 0.08,
        test_ratio: float = 0.2,
        random_seed: int = 42,
        verbose: bool = True,
    ) -> Dict:
        """Generate dataset, apply preprocessing, and persist to disk.

        Returns:
            Metadata dictionary with paths and statistics.
        """
        self.data_dir.mkdir(parents=True, exist_ok=True)

        gen = BehavioralDataGenerator(
            n_samples=n_samples,
            noise_std=noise_std,
            random_seed=random_seed,
        )
        X_train_raw, X_test_raw, y_train, y_test = gen.generate_split(test_ratio=test_ratio)

        # Fit preprocessor on training data only, transform both splits
        X_train = self.preprocessor.fit_transform(X_train_raw)
        X_test = self.preprocessor.transform(X_test_raw)

        # Save arrays
        np.save(self.data_dir / "X_train.npy", X_train)
        np.save(self.data_dir / "X_test.npy", X_test)
        np.save(self.data_dir / "y_train.npy", y_train)
        np.save(self.data_dir / "y_test.npy", y_test)

        # Compute class distribution stats
        def class_counts(y):
            return {BEHAVIOR_CLASSES[i]: int(np.sum(y == i)) for i in range(N_CLASSES)}

        # Compute feature statistics from training set
        feature_stats = {
            name: {
                "mean": float(np.mean(X_train[:, i])),
                "std": float(np.std(X_train[:, i])),
                "min": float(np.min(X_train[:, i])),
                "max": float(np.max(X_train[:, i])),
            }
            for i, name in enumerate(FEATURE_NAMES)
        }

        metadata = {
            "generation_params": gen.get_metadata(),
            "split": {
                "train_size": int(len(X_train)),
                "test_size": int(len(X_test)),
                "test_ratio": test_ratio,
            },
            "class_counts": {
                "train": class_counts(y_train),
                "test": class_counts(y_test),
            },
            "feature_stats": feature_stats,
            "paths": {
                "X_train": str(self.data_dir / "X_train.npy"),
                "X_test": str(self.data_dir / "X_test.npy"),
                "y_train": str(self.data_dir / "y_train.npy"),
                "y_test": str(self.data_dir / "y_test.npy"),
            },
        }

        with open(self.data_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        if verbose:
            print(f"Dataset saved to {self.data_dir}/")
            print(f"  Train: {len(X_train)} samples | Test: {len(X_test)} samples")
            for cls, cnt in metadata["class_counts"]["train"].items():
                pct = cnt / len(X_train) * 100
                print(f"  {cls}: {cnt} train samples ({pct:.1f}%)")

        return metadata

    def load(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load preprocessed dataset from disk.

        Returns:
            Tuple of (X_train, X_test, y_train, y_test).
        """
        required = ["X_train.npy", "X_test.npy", "y_train.npy", "y_test.npy"]
        for fname in required:
            path = self.data_dir / fname
            if not path.exists():
                raise FileNotFoundError(
                    f"Dataset file not found: {path}\n"
                    f"Run generate_dataset.py first."
                )

        return (
            np.load(self.data_dir / "X_train.npy"),
            np.load(self.data_dir / "X_test.npy"),
            np.load(self.data_dir / "y_train.npy"),
            np.load(self.data_dir / "y_test.npy"),
        )

    def load_metadata(self) -> Dict:
        """Load metadata JSON from disk."""
        path = self.data_dir / "metadata.json"
        if not path.exists():
            raise FileNotFoundError(f"Metadata not found: {path}")
        with open(path) as f:
            return json.load(f)
```

Update `src/data/__init__.py`:
```python
from .schemas import FEATURE_NAMES, BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES, PredictionResult
from .preprocessing import FeaturePreprocessor
from .generator import BehavioralDataGenerator
from .dataset import DatasetManager
```
</action>
<acceptance_criteria>
- `src/data/dataset.py` contains `class DatasetManager`
- `src/data/dataset.py` contains `def generate_and_save(`
- `src/data/dataset.py` contains `def load(self)`
- `src/data/dataset.py` contains `np.save(self.data_dir / "X_train.npy"`
- `src/data/dataset.py` contains `json.dump(metadata`
- `src/data/__init__.py` contains `from .dataset import DatasetManager`
</acceptance_criteria>
</task>

<task id="2.2.2">
<title>Create generate_dataset.py entrypoint script</title>
<read_first>
- src/data/dataset.py
</read_first>
<action>
Create `generate_dataset.py` at project root:

```python
#!/usr/bin/env python3
"""Entrypoint script to generate and save the synthetic Perceptra dataset."""
import sys
import os

# Ensure src is importable from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data import DatasetManager

if __name__ == "__main__":
    print("=" * 50)
    print("Perceptra — Generating Synthetic Dataset")
    print("=" * 50)

    manager = DatasetManager()
    metadata = manager.generate_and_save(
        n_samples=15000,
        noise_std=0.08,
        test_ratio=0.2,
        random_seed=42,
        verbose=True,
    )

    print(f"\nMetadata saved to data/synthetic/metadata.json")
    print("Done! Run training next.")
```
</action>
<acceptance_criteria>
- `generate_dataset.py` exists at project root
- `generate_dataset.py` contains `DatasetManager()`
- `generate_dataset.py` contains `n_samples=15000`
- `generate_dataset.py` contains `noise_std=0.08`
</acceptance_criteria>
</task>

## Verification
```bash
source .venv/bin/activate
python generate_dataset.py
ls -la data/synthetic/
python -c "
import numpy as np, json
X_train = np.load('data/synthetic/X_train.npy')
X_test = np.load('data/synthetic/X_test.npy')
y_train = np.load('data/synthetic/y_train.npy')
y_test = np.load('data/synthetic/y_test.npy')
with open('data/synthetic/metadata.json') as f:
    meta = json.load(f)
print(f'X_train: {X_train.shape}, X_test: {X_test.shape}')
print(f'y_train: {y_train.shape}, y_test: {y_test.shape}')
print(f'Train class counts: {meta[\"class_counts\"][\"train\"]}')
assert X_train.shape[1] == 8
assert len(set(y_train)) == 3
print('Persistence verification passed!')
"
```
