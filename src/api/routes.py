"""WebSocket routes for real-time behavioral inference."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# ModelManager is injected by main.py via app.state
_manager = None


def set_manager(manager):
    """Set the global manager reference (called at startup by main.py)."""
    global _manager
    _manager = manager


# ── IMPORTANT: Static /all route must be registered BEFORE the dynamic
# ── /{model_name} route so FastAPI matches it first.

@router.websocket("/inference/all")
async def inference_all_ws(websocket: WebSocket):
    """WebSocket endpoint for ALL models simultaneously.

    Client sends JSON telemetry, receives predictions from every model
    in a single response keyed by model name.

    Response shape:
        {
            "AMNP": { "predicted_class": "focused", ... },
            "NeuralNetwork": { ... },
            "SVM": { ... },
            "Perceptron": { ... }
        }
    """
    await websocket.accept()

    if _manager is None:
        await websocket.send_json({"error": "Models not loaded"})
        await websocket.close()
        return

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                telemetry = json.loads(raw_text)
                results = _manager.get_all_predictions(telemetry)
                await websocket.send_json(results)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
            except KeyError as e:
                await websocket.send_json({"error": f"Missing feature: {e}"})
            except Exception as e:
                await websocket.send_json({"error": str(e)})
    except WebSocketDisconnect:
        pass


@router.websocket("/inference/{model_name}")
async def inference_ws(websocket: WebSocket, model_name: str):
    """WebSocket endpoint for streaming real-time predictions.

    Client sends JSON telemetry, receives classification + explanation.

    Path parameter:
        model_name: One of 'Perceptron', 'SVM', 'NeuralNetwork', 'AMNP'.
    """
    await websocket.accept()

    # Validate model name upfront
    if _manager is None or model_name not in _manager.list_models():
        await websocket.send_json(
            {
                "error": f"Unknown model: {model_name}",
                "available": _manager.list_models() if _manager else [],
            }
        )
        await websocket.close()
        return

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                telemetry = json.loads(raw_text)
                result = _manager.get_prediction(model_name, telemetry)
                await websocket.send_json(result)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
            except KeyError as e:
                await websocket.send_json({"error": f"Missing feature: {e}"})
            except Exception as e:
                await websocket.send_json({"error": str(e)})
    except WebSocketDisconnect:
        pass
