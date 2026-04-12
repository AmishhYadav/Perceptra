---
phase: 4
plan: 2
title: "Inference Model Manager"
wave: 2
depends_on: ["04-PLAN-1"]
files_modified:
  - requirements.txt
  - src/api/manager.py
  - src/api/schemas.py
autonomous: true
requirements: []
---

# Plan 2: Inference Model Manager

## Goal
Establish the strict schema validation for the raw telemetry array using Pydantic, and create the `ModelManager` singleton responsible for fetching models from memory rather than disk per request.

## must_haves
- Append `fastapi`, `uvicorn`, `websockets`, `pydantic` to `requirements.txt`.
- Define `TelemetryPayload` corresponding directly to `FEATURE_NAMES` in `schemas.py`.
- Define `ModelManager` class which instances `AMNPModel`, `NeuralNetModel`, `PerceptronModel`, `SVMModel` and `FeaturePreprocessor` upon initialization and assigns loaded weights.
- Create central `.predict_from_payload(payload, active_model_name)` method that normalizes the input, queries the requested model class, and returns both `probabilities` and `explanation`.

## Tasks

<task id="4.2.1">
<title>API Environment & Pydantic Definitions</title>
<read_first>
- src/data/schemas.py
</read_first>
<action>
1. Update `requirements.txt`.
2. Create `src/api/schemas.py`.
3. Import `pydantic.BaseModel`. Create `TelemetryInput` with the eight required fields heavily typed (floats).
4. Create `PredictionOutput` representing class predictions and margin data.
</action>
<acceptance_criteria>
- Dependencies logged. Pydantic objects fully mirror inference data contract.
</acceptance_criteria>
</task>

<task id="4.2.2">
<title>Develop Memory-Resident ModelManager</title>
<read_first>
- src/api/manager.py
</read_first>
<action>
1. Structure `ModelManager` class.
2. In `__init__`, manually instantiate all 4 `BaseModel` compliant classes. Call `.load(path)` pointing to `data/weights/` equivalents.
3. Load `preprocessor.joblib`.
4. Implement routing function `.get_prediction(model_key, telemetry_dict)` mapping string literal to runtime model.
</action>
<acceptance_criteria>
- `manager.py` manages ML lifecycle in-memory. Output conforms directly to expected JSON broadcasting struct.
</acceptance_criteria>
</task>

## Verification
```bash
python -c "
from src.api.manager import ModelManager
import numpy as np

# Boot singleton manually to ensure no disk errors
mm = ModelManager()
assert mm.preprocessor is not None
assert 'AMNP' in mm.models

# Try a dummy inference passing raw dict
test_input = {'click_frequency': 1.0, 'hesitation_time': 2.0, 'misclick_rate': 0.1, 'scroll_depth': 400.0, 'movement_smoothness': 0.8, 'dwell_time': 5.0, 'navigation_speed': 600.0, 'direction_changes': 2.0}
res = mm.get_prediction('AMNP', test_input)
print(res)
assert 'probabilities' in res
print('Model Manager operational')
"
```
