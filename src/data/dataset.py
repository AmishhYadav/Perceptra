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

        # Persist preprocessor for inference parity
        self.preprocessor.save(self.data_dir / "preprocessor.joblib")

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
