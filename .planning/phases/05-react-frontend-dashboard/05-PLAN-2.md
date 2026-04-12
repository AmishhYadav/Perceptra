---
phase: 5
plan: 2
title: "Control Panel & Simulation Tools"
wave: 2
depends_on: ["05-PLAN-1"]
files_modified:
  - frontend/src/components/ControlPanel.tsx
  - frontend/src/components/TelemetrySliders.tsx
autonomous: true
requirements: []
---

# Plan 2: Control Panel & Simulation Tools

## Goal
Because Perceptra doesn't have a real DOM-tracking client yet, we must simulate the 8 raw telemetry features visually. This plan implements the UI levers needed to push continuous JSON feature arrays into the active WebSocket connection.

## must_haves
- Interactive drop-down `ModelSelector` dispatching `connectToModel("AMNP")` to reconnect.
- A vertical list of HTML `<input type="range">` sliders corresponding directly to `click_frequency`, `hesitation_time`, etc.
- An internal `useEffect` pinging exactly 10 times per second (100ms interval) that plucks the active slider values and invokes `sendTelemetry(payload)` over the socket.

## Tasks

<task id="5.2.1">
<title>Build Model Selection Matrix</title>
<read_first>
- frontend/src/store/useInferenceStore.ts
</read_first>
<action>
1. Create `ModelSelector.tsx`.
2. Map `["AMNP", "NeuralNetwork", "SVM", "Perceptron"]`.
3. Highlight active model. On click, call `store.connectToModel(name)`.
</action>
<acceptance_criteria>
- Selection cleanly destroys the previous WebSocket and negotiates a new connection to the Python backend immediately.
</acceptance_criteria>
</task>

<task id="5.2.2">
<title>Develop Interactive Telemetry Emitters</title>
<action>
1. Create `TelemetrySliders.tsx`. 
2. Manage local component state `sliders: Record<string, number>` for the 8 features.
3. Build a stylized Tailwind slider for each tracking a `0.0` to `1.0` normalized range.
4. Establish a `setInterval` hook locked at 100ms. On tick, execute `store.sendTelemetry(sliders)`. 
</action>
<acceptance_criteria>
- Component autonomously trickles data into the WebSocket 10 times a second. Moving sliders immediately shifts the stream.
</acceptance_criteria>
</task>

## Verification
```bash
# Developer-side: Run API, adjust UI slider, ensure network tab shows WS traffic pinging consistently.
```
