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
        await websocket.send_json({
            "error": f"Unknown model: {model_name}",
            "available": _manager.list_models() if _manager else [],
        })
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
