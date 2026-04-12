"""Feature preprocessing pipeline for normalizing raw telemetry into model inputs."""
import numpy as np
from typing import List, Dict, Optional
from .schemas import FEATURE_NAMES, N_FEATURES


class FeaturePreprocessor:
    """Normalizes raw telemetry data into fixed-size, zero-mean, unit-variance feature vectors.

    Usage:
        preprocessor = FeaturePreprocessor()
        X_train = preprocessor.fit_transform(X_raw_train)
        X_test = preprocessor.transform(X_raw_test)
    """

    def __init__(self):
        self.mean_: Optional[np.ndarray] = None
        self.std_: Optional[np.ndarray] = None
        self.is_fitted = False

    def fit(self, X: np.ndarray) -> "FeaturePreprocessor":
        """Compute mean and std from the training data.

        Args:
            X: Feature matrix of shape (n_samples, n_features).

        Returns:
            self (for chaining).
        """
        self.mean_ = np.mean(X, axis=0)
        self.std_ = np.std(X, axis=0) + 1e-8  # prevent division by zero
        self.is_fitted = True
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Normalize X using the previously fitted mean and std.

        Args:
            X: Feature matrix of shape (n_samples, n_features).

        Returns:
            Normalized feature matrix of the same shape.
        """
        if not self.is_fitted:
            raise RuntimeError("FeaturePreprocessor must be fitted before transform")
        return (X - self.mean_) / self.std_

    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """Fit on X and return the normalized result."""
        return self.fit(X).transform(X)

    @staticmethod
    def from_raw_json(records: List[Dict]) -> np.ndarray:
        """Convert a list of raw telemetry JSON dictionaries into a NumPy feature matrix.

        Each dict should have keys matching FEATURE_NAMES. Missing keys default to 0.0.

        Args:
            records: List of dicts, each representing one interaction window.

        Returns:
            NumPy array of shape (len(records), N_FEATURES) with dtype float32.
        """
        vectors = []
        for record in records:
            vec = [record.get(name, 0.0) for name in FEATURE_NAMES]
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)
