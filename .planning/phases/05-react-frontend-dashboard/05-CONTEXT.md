# Phase 05: React Frontend Dashboard - Context

**Gathered:** April 2026
**Status:** Ready for planning
**Source:** Interaction Decisions

<domain>
## Phase Boundary

This phase creates the user-facing experimentation environment. It revolves around a React/TypeScript application running on Vite, establishing a continuous WebSocket link to the FastAPI inference server to visualize the internal ML decision-making processes in pseudo-real-time.
</domain>

<decisions>
## Implementation Decisions

### A. CSS / Styling Framework (Tailwind CSS)
- **Decision**: Next-generation utility-first styling.
- **Details**: Tailwind will allow rapid prototyping of complex dashboard layouts and fluid UI states without heavy CSS module management.

### B. Charting Library (Recharts)
- **Decision**: Composable React charting for real-time visualization.
- **Details**: Recharts explicitly handles dynamic React state bounds well, allowing us to build a bar chart for feature importances and a changing line/area plot for AMNP margins.

### C. State Management (Zustand)
- **Decision**: Lightweight, hook-based state management specifically targeting rapid updates.
- **Details**: Because the WebSocket may stream telemetry predictions at high frequencies (10-50Hz), dropping updates in React Context causes massive top-down re-renders. Zustand allows discrete components (e.g., just the probability dials) to subscribe perfectly to state slices without re-rendering the parent layout grid.
</decisions>

<canonical_refs>
## Canonical References
- `frontend/` — Entire application will reside here.
- `src/api/schemas.py` — The strict JSON contract the frontend must deserialize.
- `src/api/routes.py` — The WebSocket `/ws/inference/{model}` endpoint to subscribe to.
</canonical_refs>
