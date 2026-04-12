---
phase: 4
plan: 3
title: "FastAPI & WebSocket Router"
wave: 3
depends_on: ["04-PLAN-2"]
files_modified:
  - src/api/main.py
  - src/api/routes.py
autonomous: true
requirements: []
---

# Plan 3: FastAPI & WebSocket Router

## Goal
To finalize the Inference Server, we must declare the FastAPI application, wire up the startup lifecycle to warm the `ModelManager`, and implement the non-blocking WebSocket endpoint that acts as the primary data conduit between the Python backend and React frontend.

## must_haves
- The `src/api/main.py` entrypoint configured with `CORSMiddleware`.
- Expose the ModelManager instance dependency properly utilizing FastAPI dependency injection or global state (since it's a tight singleton).
- Implement `ws://localhost:8000/ws/inference/{model_name}` in `routes.py`.
- Ensure WebSocket handles the message receipt, model routing, and error handling seamlessly.

## Tasks

<task id="4.3.1">
<title>Develop WebSocket Routes</title>
<read_first>
- src/api/routes.py
</read_first>
<action>
1. Define a heavily typed `APIRouter()`.
2. Define `@router.websocket("/inference/{model_name}")`.
3. In the infinite `while True` loop, `await websocket.receive_text()`. Parse into dictionary.
4. Pass dictionary + `model_name` into `ModelManager.get_prediction()`.
5. `await websocket.send_json(results)`.
</action>
<acceptance_criteria>
- Fast stream processing successfully catches exceptions and isolates bad telemetry shapes without collapsing the connection.
</acceptance_criteria>
</task>

<task id="4.3.2">
<title>Assemble Context Entrypoint</title>
<read_first>
- src/api/main.py
</read_first>
<action>
1. Initialize FastAPI application.
2. Bind generic `CORSMiddleware`.
3. Declare Application startup lifecycle to boot `ModelManager`.
4. Include API routers.
</action>
<acceptance_criteria>
- API can be deployed via `uvicorn src.api.main:app --reload`.
</acceptance_criteria>
</task>

## Verification
```bash
# This verification requires manual test or dummy script.
cat << 'EOF' > test_ws.py
import asyncio
import websockets
import json

async def test_conn():
    async with websockets.connect("ws://localhost:8000/ws/inference/AMNP") as ws:
        test_inputs = {
            "click_frequency": 0.5, "hesitation_time": 0.8, "misclick_rate": 0.1,
            "scroll_depth": 0.7, "movement_smoothness": 0.4, "dwell_time": 0.6,
            "navigation_speed": 0.5, "direction_changes": 0.2
        }
        await ws.send(json.dumps(test_inputs))
        res = await ws.recv()
        print("Success:", res)

asyncio.run(test_conn())
EOF
# Note: User must run uvicorn server in parallel to run script.
```
