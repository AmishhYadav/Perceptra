"""Feature vector schema and prediction result types for Perceptra."""

from dataclasses import dataclass, field
from typing import List, Dict


# Canonical list of behavioral telemetry features.
# All models consume and explain against these exact feature names.
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

# Behavioral state classes the models predict.
BEHAVIOR_CLASSES: List[str] = ["focused", "distracted", "confused"]

N_FEATURES = len(FEATURE_NAMES)
N_CLASSES = len(BEHAVIOR_CLASSES)


@dataclass
class PredictionResult:
    """Structured prediction output from any model."""

    predicted_class: str
    confidence: float
    class_probabilities: Dict[str, float]
    feature_contributions: Dict[str, float]
