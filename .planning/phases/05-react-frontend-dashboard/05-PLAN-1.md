---
phase: 5
plan: 1
title: "Vite Scaffolding & State Core"
wave: 1
depends_on: []
files_modified:
  - frontend/package.json
  - frontend/tailwind.config.js
  - frontend/src/store/useInferenceStore.ts
  - frontend/src/App.tsx
autonomous: true
requirements: []
---

# Plan 1: Vite Scaffolding & State Core

## Goal
Initialize the React/TypeScript environment and configure the strict WebSocket connection state using Zustand to manage high-frequency telemetry bridging between the user interface and the Python inference API.

## must_haves
- Initialize scaffolding via `npm create vite@latest frontend -- --template react-ts`.
- Setup `tailwindcss` utility configurations.
- Create `useInferenceStore.ts` defining `activeModel`, `telemetry`, and the WebSocket socket reference.
- Establish the `.connect()` and `onmessage` parsers inside the store.

## Tasks

<task id="5.1.1">
<title>Vite Initialization & Dependencies</title>
<action>
1. Run `npm create vite@latest frontend -- --template react-ts`.
2. Install `tailwindcss`, `postcss`, `autoprefixer`, `zustand`, `recharts`, `lucide-react`, `concurrently`.
3. Initialize tailwind via `npx tailwindcss init -p` and set content paths.
4. Update `package.json` with the concurrently bootstrap script `dev:all`.
</action>
<acceptance_criteria>
- Frontend directory is built and builds without errors. Tailwind utility classes apply successfully.
</acceptance_criteria>
</task>

<task id="5.1.2">
<title>Zustand WebSocket Store</title>
<read_first>
- src/api/schemas.py
</read_first>
<action>
1. Create `frontend/src/store/useInferenceStore.ts`.
2. Define TypeScript interfaces for `PredictionOutput` and `TelemetryInput` mimicking `schemas.py`.
3. Build the store: manage a persistent `WebSocket` object.
4. Action `connectToModel(modelName)`: closes old WS, opens `ws://localhost:8000/ws/inference/{modelName}`. Listens to `onmessage` to `set({ currentPrediction: parsed })`.
5. Action `sendTelemetry(payload)`: wraps and `ws.send(JSON.stringify(payload))`.
</action>
<acceptance_criteria>
- Store manages pure connections and cleanly cleans up listeners on reconfiguration. Components can seamlessly subscribe to `currentPrediction`.
</acceptance_criteria>
</task>

## Verification
```bash
# Verify structure
cd frontend && npm run build
```
