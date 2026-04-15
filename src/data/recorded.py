"""Recorded telemetry data manager — stores and loads real user sessions.

Each recording session captures telemetry snapshots from the BehaviorAssessment
game tagged with a user-declared behavioral label. This replaces the synthetic
Gaussian data with realistic, non-linear distributions.

Storage: JSON Lines format at data/recorded/sessions.jsonl
Each line = one session: { session_id, label, timestamp, samples: [[8 features], ...] }
"""

import json
import uuid
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

from .schemas import BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES
from .preprocessing import FeaturePreprocessor


RECORDED_DIR = Path("data/recorded")
SESSIONS_FILE = RECORDED_DIR / "sessions.jsonl"


class RecordedDataManager:
    """Manages recording, persistence, and loading of real user telemetry."""

    def __init__(self, data_dir: Path = RECORDED_DIR):
        self.data_dir = Path(data_dir)
        self.sessions_file = self.data_dir / "sessions.jsonl"

    def save_session(
        self,
        label: str,
        samples: List[List[float]],
        session_id: Optional[str] = None,
    ) -> Dict:
        """Persist a labeled recording session to disk.

        Args:
            label: One of 'focused', 'distracted', 'confused'.
            samples: List of 8-feature telemetry vectors (each already in [0,1]).
            session_id: Optional session identifier; auto-generated if omitted.

        Returns:
            Session metadata dict.
        """
        if label not in BEHAVIOR_CLASSES:
            raise ValueError(f"Invalid label '{label}'. Must be one of {BEHAVIOR_CLASSES}")
        if not samples or len(samples) == 0:
            raise ValueError("No samples to record")
        for i, sample in enumerate(samples):
            if len(sample) != N_FEATURES:
                raise ValueError(
                    f"Sample {i} has {len(sample)} features, expected {N_FEATURES}"
                )

        self.data_dir.mkdir(parents=True, exist_ok=True)

        session = {
            "session_id": session_id or str(uuid.uuid4()),
            "label": label,
            "label_index": BEHAVIOR_CLASSES.index(label),
            "timestamp": datetime.now().isoformat(),
            "n_samples": len(samples),
            "samples": samples,
        }

        # Append to JSONL file (one session per line)
        with open(self.sessions_file, "a") as f:
            f.write(json.dumps(session) + "\n")

        return {
            "session_id": session["session_id"],
            "label": label,
            "n_samples": len(samples),
            "timestamp": session["timestamp"],
        }

    def load_all(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load all recorded sessions into numpy arrays.

        Returns:
            Tuple of (X, y) where X is (n_total_samples, 8) and y is (n_total_samples,).
        """
        if not self.sessions_file.exists():
            return np.empty((0, N_FEATURES), dtype=np.float32), np.empty(0, dtype=np.int64)

        all_X = []
        all_y = []

        with open(self.sessions_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                session = json.loads(line)
                label_idx = session["label_index"]
                for sample in session["samples"]:
                    all_X.append(sample)
                    all_y.append(label_idx)

        if not all_X:
            return np.empty((0, N_FEATURES), dtype=np.float32), np.empty(0, dtype=np.int64)

        return (
            np.array(all_X, dtype=np.float32),
            np.array(all_y, dtype=np.int64),
        )

    def get_stats(self) -> Dict:
        """Return recording statistics: total samples and per-class counts."""
        stats = {
            "total_sessions": 0,
            "total_samples": 0,
            "per_class": {cls: {"sessions": 0, "samples": 0} for cls in BEHAVIOR_CLASSES},
        }

        if not self.sessions_file.exists():
            return stats

        with open(self.sessions_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                session = json.loads(line)
                label = session["label"]
                n = session["n_samples"]
                stats["total_sessions"] += 1
                stats["total_samples"] += n
                stats["per_class"][label]["sessions"] += 1
                stats["per_class"][label]["samples"] += n

        return stats

    def prepare_training_data(
        self,
        test_ratio: float = 0.2,
        random_seed: int = 42,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load recorded data, preprocess, and split into train/test.

        Applies FeaturePreprocessor (fit on train split) and saves it
        to the standard path so the inference pipeline uses the same
        normalization as training.

        Returns:
            Tuple of (X_train, X_test, y_train, y_test).
        """
        X, y = self.load_all()
        if len(X) == 0:
            raise ValueError("No recorded data available. Record some sessions first.")

        # Stratified-ish shuffle split
        rng = np.random.RandomState(random_seed)
        indices = rng.permutation(len(X))
        n_test = max(int(len(X) * test_ratio), 1)

        test_idx = indices[:n_test]
        train_idx = indices[n_test:]

        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        # Fit preprocessor on training split and SAVE it so the inference
        # pipeline (ModelManager) uses the exact same normalization.
        preprocessor = FeaturePreprocessor()
        X_train = preprocessor.fit_transform(X_train)
        X_test = preprocessor.transform(X_test)

        # Save to the standard path used by ModelManager at startup
        from pathlib import Path
        preprocessor_path = Path("data/synthetic/preprocessor.joblib")
        preprocessor_path.parent.mkdir(parents=True, exist_ok=True)
        preprocessor.save(str(preprocessor_path))
        print(f"  ✓ Preprocessor saved to {preprocessor_path}")

        return X_train, X_test, y_train, y_test

    def clear(self) -> None:
        """Delete all recorded sessions."""
        if self.sessions_file.exists():
            self.sessions_file.unlink()
