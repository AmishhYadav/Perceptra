"""REST endpoints for recording real user telemetry sessions."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import List

from src.data.recorded import RecordedDataManager
from src.data.schemas import BEHAVIOR_CLASSES, N_FEATURES


router = APIRouter(prefix="/api/recording", tags=["recording"])

_manager = RecordedDataManager()


class RecordSessionRequest(BaseModel):
    """Payload for recording a labeled telemetry session."""
    label: str
    samples: List[List[float]]

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        if v not in BEHAVIOR_CLASSES:
            raise ValueError(f"label must be one of {BEHAVIOR_CLASSES}, got '{v}'")
        return v

    @field_validator("samples")
    @classmethod
    def validate_samples(cls, v: List[List[float]]) -> List[List[float]]:
        if len(v) == 0:
            raise ValueError("samples must not be empty")
        for i, sample in enumerate(v):
            if len(sample) != N_FEATURES:
                raise ValueError(
                    f"sample[{i}] has {len(sample)} features, expected {N_FEATURES}"
                )
        return v


@router.post("/record")
async def record_session(req: RecordSessionRequest):
    """Record a labeled telemetry session from the BehaviorAssessment game.

    The frontend sends all telemetry snapshots from a game session along with
    the user's declared behavioral state (focused/distracted/confused).
    """
    try:
        result = _manager.save_session(label=req.label, samples=req.samples)
        return {"status": "ok", **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats")
async def recording_stats():
    """Return recording statistics: total sessions, samples, and per-class counts."""
    return _manager.get_stats()


@router.delete("/clear")
async def clear_recordings():
    """Delete all recorded sessions. Use with caution."""
    _manager.clear()
    return {"status": "cleared"}
