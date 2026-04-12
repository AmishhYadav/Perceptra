"""Perceptra Inference Server — FastAPI entrypoint."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.manager import ModelManager
from src.api.routes import router as ws_router, set_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: load models at startup, cleanup at shutdown."""
    print("▸ Loading Perceptra models into memory...")
    manager = ModelManager()
    app.state.manager = manager
    set_manager(manager)
    print(f"  ✓ Models ready: {manager.list_models()}")
    yield
    print("▸ Perceptra server shutting down.")


app = FastAPI(
    title="Perceptra Inference API",
    description="Real-time behavioral classification via WebSocket streaming.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount WebSocket routes under /ws
app.include_router(ws_router, prefix="/ws")


@app.get("/health")
async def health():
    """Basic health check endpoint."""
    return {"status": "ok", "models": app.state.manager.list_models()}
