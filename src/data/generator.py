"""Synthetic behavioral telemetry dataset generator for Perceptra."""

import numpy as np
from typing import Tuple, Dict, Optional
from .schemas import FEATURE_NAMES, BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES


# Per-class feature distribution parameters (mean, std) in normalized [0,1] space.
# Index order matches FEATURE_NAMES: click_frequency, hesitation_time, misclick_rate,
# scroll_depth, movement_smoothness, dwell_time, navigation_speed, direction_changes
CLASS_DISTRIBUTIONS = {
    "focused": {
        "means": np.array([0.80, 0.10, 0.05, 0.70, 0.90, 0.30, 0.70, 0.10]),
        "stds": np.array([0.10, 0.05, 0.03, 0.10, 0.05, 0.10, 0.10, 0.05]),
    },
    "distracted": {
        "means": np.array([0.50, 0.50, 0.30, 0.40, 0.50, 0.60, 0.40, 0.40]),
        "stds": np.array([0.20, 0.20, 0.15, 0.20, 0.20, 0.20, 0.25, 0.20]),
    },
    "confused": {
        "means": np.array([0.30, 0.80, 0.60, 0.20, 0.20, 0.70, 0.20, 0.80]),
        "stds": np.array([0.15, 0.15, 0.20, 0.15, 0.15, 0.15, 0.15, 0.15]),
    },
}

# Class proportions (must sum to 1.0)
CLASS_PROPORTIONS = {
    "focused": 0.50,
    "distracted": 0.30,
    "confused": 0.20,
}


class BehavioralDataGenerator:
    """Generates synthetic behavioral telemetry data for model training.

    Simulates three behavioral states (focused, distracted, confused) using
    class-specific Gaussian distributions with partial class overlap and
    additive noise to reflect human variability.
    """

    def __init__(
        self,
        n_samples: int = 15000,
        noise_std: float = 0.08,
        random_seed: int = 42,
    ):
        self.n_samples = n_samples
        self.noise_std = noise_std
        self.random_seed = random_seed
        self.rng = np.random.default_rng(random_seed)

    def generate(self) -> Tuple[np.ndarray, np.ndarray]:
        """Generate the full synthetic dataset.

        Returns:
            Tuple of (X, y) where:
              X: float32 array of shape (n_samples, N_FEATURES) with values in [0, 1]
              y: int array of shape (n_samples,) with class indices 0=focused, 1=distracted, 2=confused
        """
        X_parts = []
        y_parts = []

        for class_idx, class_name in enumerate(BEHAVIOR_CLASSES):
            n_class = int(self.n_samples * CLASS_PROPORTIONS[class_name])
            dist = CLASS_DISTRIBUTIONS[class_name]

            # Sample from class-specific Gaussian distribution
            samples = self.rng.normal(
                loc=dist["means"],
                scale=dist["stds"],
                size=(n_class, N_FEATURES),
            )

            # Add global noise layer simulating human variability
            noise = self.rng.normal(0.0, self.noise_std, size=samples.shape)
            samples = samples + noise

            # Clip to valid [0, 1] range
            samples = np.clip(samples, 0.0, 1.0)

            X_parts.append(samples.astype(np.float32))
            y_parts.append(np.full(n_class, class_idx, dtype=np.int64))

        X = np.vstack(X_parts)
        y = np.concatenate(y_parts)

        # Shuffle dataset
        indices = self.rng.permutation(len(X))
        return X[indices], y[indices]

    def generate_split(
        self, test_ratio: float = 0.2
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Generate dataset and return train/test split.

        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        X, y = self.generate()
        n_test = int(len(X) * test_ratio)
        return X[n_test:], X[:n_test], y[n_test:], y[:n_test]

    def get_metadata(self) -> Dict:
        """Return generation parameters for reproducibility logging."""
        return {
            "n_samples": self.n_samples,
            "noise_std": self.noise_std,
            "random_seed": self.random_seed,
            "class_proportions": CLASS_PROPORTIONS,
            "feature_names": FEATURE_NAMES,
            "behavior_classes": BEHAVIOR_CLASSES,
            "distributions": {
                name: {
                    "means": dist["means"].tolist(),
                    "stds": dist["stds"].tolist(),
                }
                for name, dist in CLASS_DISTRIBUTIONS.items()
            },
        }
