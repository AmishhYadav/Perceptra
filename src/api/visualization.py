"""WebSocket route for real-time training visualization with PCA-reduced data."""

import json
import asyncio
import numpy as np
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sklearn.decomposition import PCA

from src.data.schemas import BEHAVIOR_CLASSES, N_FEATURES, N_CLASSES
from src.models import PerceptronModel, SVMModel, NeuralNetModel, AMNPModel

router = APIRouter()

DATA_DIR = Path("data/synthetic")
MAX_POINTS = 400
GRID_SIZE = 50
DEFAULT_EPOCHS = 100
DEFAULT_DELAY_MS = 80


def _load_pca_data():
    """Load synthetic dataset, subsample, and fit PCA to 2D."""
    X_train = np.load(DATA_DIR / "X_train.npy")
    y_train = np.load(DATA_DIR / "y_train.npy")

    # Subsample for smooth rendering
    n = len(X_train)
    if n > MAX_POINTS:
        indices = np.random.RandomState(42).choice(n, MAX_POINTS, replace=False)
        X_sub = X_train[indices]
        y_sub = y_train[indices]
    else:
        X_sub = X_train
        y_sub = y_train

    # Fit PCA on the full training set for stable axes
    pca = PCA(n_components=2)
    pca.fit(X_train)

    X_2d = pca.transform(X_sub)
    return X_sub, y_sub, X_2d, pca


def _make_boundary_grid(pca: PCA, model, x_range, y_range):
    """Sample a grid in 2D PCA space, inverse-transform to 8D, predict probabilities."""
    xs = np.linspace(x_range[0], x_range[1], GRID_SIZE)
    ys = np.linspace(y_range[0], y_range[1], GRID_SIZE)
    xx, yy = np.meshgrid(xs, ys)
    grid_2d = np.c_[xx.ravel(), yy.ravel()]

    # Inverse transform back to original 8D space
    grid_8d = pca.inverse_transform(grid_2d).astype(np.float32)

    # Clamp to reasonable range to prevent overflow in model predictions
    grid_8d = np.clip(grid_8d, -10.0, 10.0)
    grid_8d = np.nan_to_num(grid_8d, nan=0.0, posinf=10.0, neginf=-10.0)

    # Get class probabilities for each grid cell
    try:
        probas = model.predict_proba(grid_8d)  # (GRID_SIZE^2, 3)
        probas = np.nan_to_num(probas, nan=1.0 / N_CLASSES)
    except Exception:
        # Fallback: uniform probabilities
        probas = np.full((GRID_SIZE * GRID_SIZE, N_CLASSES), 1.0 / N_CLASSES)

    return probas.tolist()


def _create_model(model_name: str):
    """Instantiate a fresh untrained model."""
    constructors = {
        "Perceptron": PerceptronModel,
        "SVM": SVMModel,
        "NeuralNetwork": NeuralNetModel,
        "AMNP": AMNPModel,
    }
    if model_name not in constructors:
        return None
    return constructors[model_name](n_features=N_FEATURES, n_classes=N_CLASSES)


@router.websocket("/visualization/{model_name}")
async def visualization_ws(websocket: WebSocket, model_name: str):
    """WebSocket endpoint for streaming training visualization frames.

    Sends PCA-reduced scatter data and decision boundary grids epoch-by-epoch.

    Client can send control messages:
        {"action": "start"}
        {"action": "pause"}
        {"action": "resume"}
        {"action": "speed", "value": 50}  (ms between epochs)
        {"action": "reset"}
    """
    await websocket.accept()

    # Validate model
    valid_models = ["Perceptron", "SVM", "NeuralNetwork", "AMNP"]
    if model_name not in valid_models:
        await websocket.send_json({"error": f"Unknown model: {model_name}"})
        await websocket.close()
        return

    # Load and PCA-reduce data
    try:
        X_sub, y_sub, X_2d, pca = _load_pca_data()
    except FileNotFoundError as e:
        await websocket.send_json({"error": f"Dataset not found: {e}"})
        await websocket.close()
        return

    # Compute axis ranges with padding
    pad = 0.5
    x_range = [float(X_2d[:, 0].min() - pad), float(X_2d[:, 0].max() + pad)]
    y_range = [float(X_2d[:, 1].min() - pad), float(X_2d[:, 1].max() + pad)]

    # Send initial data frame with scatter points
    init_frame = {
        "type": "init",
        "model_name": model_name,
        "points": [
            {
                "x": float(X_2d[i, 0]),
                "y": float(X_2d[i, 1]),
                "true_label": int(y_sub[i]),
            }
            for i in range(len(X_2d))
        ],
        "classes": BEHAVIOR_CLASSES,
        "x_range": x_range,
        "y_range": y_range,
        "grid_size": GRID_SIZE,
        "total_epochs": DEFAULT_EPOCHS,
    }
    await websocket.send_json(init_frame)

    # Playback state
    playing = False
    paused = False
    delay_ms = DEFAULT_DELAY_MS
    current_model = None

    try:
        while True:
            # Wait for client commands
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action", "")

            if action == "speed":
                delay_ms = max(20, min(500, int(msg.get("value", DEFAULT_DELAY_MS))))
                continue

            if action == "pause":
                paused = True
                continue

            if action == "resume":
                paused = False
                continue

            if action == "reset":
                playing = False
                paused = False
                await websocket.send_json({"type": "reset"})
                continue

            if action == "start":
                playing = True
                paused = False

                # Create fresh model
                current_model = _create_model(model_name)
                if current_model is None:
                    await websocket.send_json({"error": "Failed to create model"})
                    continue

                # Run training in epoch loop
                if model_name == "SVM":
                    # SVM: simulate progressive training with data subsets
                    steps = 20
                    for step in range(1, steps + 1):
                        if not playing:
                            break

                        # Check for incoming control messages (non-blocking)
                        while paused and playing:
                            try:
                                ctrl = await asyncio.wait_for(
                                    websocket.receive_text(), timeout=0.2
                                )
                                ctrl_msg = json.loads(ctrl)
                                if ctrl_msg.get("action") == "resume":
                                    paused = False
                                elif ctrl_msg.get("action") == "pause":
                                    paused = True
                                elif ctrl_msg.get("action") == "speed":
                                    delay_ms = max(
                                        20,
                                        min(
                                            500,
                                            int(
                                                ctrl_msg.get("value", DEFAULT_DELAY_MS)
                                            ),
                                        ),
                                    )
                                elif ctrl_msg.get("action") == "reset":
                                    playing = False
                                    await websocket.send_json({"type": "reset"})
                            except asyncio.TimeoutError:
                                continue

                        if not playing:
                            break

                        # Progressive subset training
                        frac = step / steps
                        n_use = max(20, int(len(X_sub) * frac))
                        current_model = _create_model(model_name)
                        current_model.train(
                            X_sub[:n_use], y_sub[:n_use], epochs=100, lr=0.01
                        )

                        preds = current_model.predict(X_sub)
                        acc = float(np.mean(preds == y_sub))
                        boundary = _make_boundary_grid(
                            pca, current_model, x_range, y_range
                        )

                        frame = {
                            "type": "epoch",
                            "epoch": step,
                            "total_epochs": steps,
                            "predictions": preds.tolist(),
                            "accuracy": acc,
                            "loss": 1.0 - acc,
                            "boundary": {
                                "x_range": x_range,
                                "y_range": y_range,
                                "grid_size": GRID_SIZE,
                                "probabilities": boundary,
                            },
                        }
                        await websocket.send_json(frame)
                        await asyncio.sleep(delay_ms / 1000.0)

                    if playing:
                        await websocket.send_json({"type": "complete"})
                    playing = False

                else:
                    # Epoch-by-epoch training for NN, AMNP, Perceptron
                    total_epochs = DEFAULT_EPOCHS
                    for epoch in range(1, total_epochs + 1):
                        if not playing:
                            break

                        # Non-blocking control check
                        try:
                            ctrl = await asyncio.wait_for(
                                websocket.receive_text(), timeout=0.001
                            )
                            ctrl_msg = json.loads(ctrl)
                            if ctrl_msg.get("action") == "pause":
                                paused = True
                            elif ctrl_msg.get("action") == "speed":
                                delay_ms = max(
                                    20,
                                    min(
                                        500,
                                        int(ctrl_msg.get("value", DEFAULT_DELAY_MS)),
                                    ),
                                )
                            elif ctrl_msg.get("action") == "reset":
                                playing = False
                                await websocket.send_json({"type": "reset"})
                                continue
                        except asyncio.TimeoutError:
                            pass

                        while paused and playing:
                            try:
                                ctrl = await asyncio.wait_for(
                                    websocket.receive_text(), timeout=0.2
                                )
                                ctrl_msg = json.loads(ctrl)
                                if ctrl_msg.get("action") == "resume":
                                    paused = False
                                elif ctrl_msg.get("action") == "pause":
                                    paused = True
                                elif ctrl_msg.get("action") == "speed":
                                    delay_ms = max(
                                        20,
                                        min(
                                            500,
                                            int(
                                                ctrl_msg.get("value", DEFAULT_DELAY_MS)
                                            ),
                                        ),
                                    )
                                elif ctrl_msg.get("action") == "reset":
                                    playing = False
                                    await websocket.send_json({"type": "reset"})
                            except asyncio.TimeoutError:
                                continue

                        if not playing:
                            break

                        # Train one epoch
                        current_model.train(X_sub, y_sub, epochs=1, lr=1e-3)

                        preds = current_model.predict(X_sub)
                        acc = float(np.mean(preds == y_sub))

                        # Compute boundary every 2 epochs for performance
                        boundary = None
                        if epoch % 2 == 0 or epoch == 1 or epoch == total_epochs:
                            boundary_data = _make_boundary_grid(
                                pca, current_model, x_range, y_range
                            )
                            boundary = {
                                "x_range": x_range,
                                "y_range": y_range,
                                "grid_size": GRID_SIZE,
                                "probabilities": boundary_data,
                            }

                        # Get loss from training history
                        loss = 0.0
                        if hasattr(current_model, "training_history"):
                            hist = current_model.training_history
                            if isinstance(hist, dict) and "loss" in hist:
                                loss = hist["loss"][-1] if hist["loss"] else 0.0

                        frame = {
                            "type": "epoch",
                            "epoch": epoch,
                            "total_epochs": total_epochs,
                            "predictions": preds.tolist(),
                            "accuracy": acc,
                            "loss": loss,
                        }
                        if boundary is not None:
                            frame["boundary"] = boundary

                        await websocket.send_json(frame)
                        await asyncio.sleep(delay_ms / 1000.0)

                    if playing:
                        await websocket.send_json({"type": "complete"})
                    playing = False

    except WebSocketDisconnect:
        pass
