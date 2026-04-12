"""Pydantic schema contracts for the Perceptra inference API."""
from pydantic import BaseModel as PydanticBase
from typing import Dict, List, Optional


class TelemetryInput(PydanticBase):
    """Raw telemetry payload matching the 8-feature behavioral schema."""
    click_frequency: float
    hesitation_time: float
    misclick_rate: float
    scroll_depth: float
    movement_smoothness: float
    dwell_time: float
    navigation_speed: float
    direction_changes: float

    def to_feature_dict(self) -> Dict[str, float]:
        return self.model_dump()


class PredictionOutput(PydanticBase):
    """Inference result broadcast to the frontend."""
    model_name: str
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    feature_importance: Dict[str, float]
    extras: Optional[Dict] = None
