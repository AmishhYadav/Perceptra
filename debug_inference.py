import numpy as np
import sys
from pathlib import Path

# Add project root to path
sys.path.append("/Users/amish/Perceptra")

from src.api.manager import ModelManager
from src.data.schemas import FEATURE_NAMES

# "Focused" behavior according to generator.py means:
# [0.80, 0.10, 0.05, 0.70, 0.90, 0.30, 0.70, 0.10]
FOCUSED_TELEMETRY = {
    "click_frequency": 0.8,
    "hesitation_time": 0.1,
    "misclick_rate": 0.05,
    "scroll_depth": 0.7,
    "movement_smoothness": 0.9,
    "dwell_time": 0.3,
    "navigation_speed": 0.7,
    "direction_changes": 0.1,
}

# "Confused" behavior:
# [0.30, 0.80, 0.60, 0.20, 0.20, 0.70, 0.20, 0.80]
CONFUSED_TELEMETRY = {
    "click_frequency": 0.3,
    "hesitation_time": 0.8,
    "misclick_rate": 0.6,
    "scroll_depth": 0.2,
    "movement_smoothness": 0.2,
    "dwell_time": 0.7,
    "navigation_speed": 0.2,
    "direction_changes": 0.8,
}

# "Distracted" (defaults):
# [0.50, 0.50, 0.30, 0.40, 0.50, 0.60, 0.40, 0.40]
DISTRACTED_TELEMETRY = {
    "click_frequency": 0.5,
    "hesitation_time": 0.5,
    "misclick_rate": 0.3,
    "scroll_depth": 0.4,
    "movement_smoothness": 0.5,
    "dwell_time": 0.6,
    "navigation_speed": 0.4,
    "direction_changes": 0.4,
}

def test_manager():
    print("Initializing ModelManager...")
    manager = ModelManager()
    
    cases = [
        ("FOCUSED", FOCUSED_TELEMETRY),
        ("CONFUSED", CONFUSED_TELEMETRY),
        ("DISTRACTED", DISTRACTED_TELEMETRY),
    ]
    
    models = ["AMNP", "NeuralNetwork", "SVM", "Perceptron"]
    
    for model_name in models:
        print(f"\n--- Testing Model: {model_name} ---")
        for label, payload in cases:
            res = manager.get_prediction(model_name, payload)
            pred = res["predicted_class"]
            conf = res["confidence"]
            print(f"Input: {label:10} | Predicted: {pred:10} | Conf: {conf:.4f}")

if __name__ == "__main__":
    test_manager()
