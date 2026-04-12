---
phase: 5
plan: 3
title: "Visualization Engine"
wave: 3
depends_on: ["05-PLAN-2"]
files_modified:
  - frontend/src/components/PredictionCard.tsx
  - frontend/src/components/Explanations.tsx
  - frontend/src/App.tsx
autonomous: true
requirements: []
---

# Plan 3: Visualization Engine

## Goal
Bind the `recentPrediction` object streaming from the Zustand store into beautiful visual displays. This requires rendering the top-level classification state as well as using Recharts to plot the mathematical reasoning of `feature_importance`.

## must_haves
- `PredictionCard` reacting to the string "focused", "distracted", or "confused", changing its main Tailwind background color and pulsing confidence levels.
- `FeatureImportanceChart` rendering a `BarChart` mapped to the 8 feature keys and their importance weights (0.0 to 1.0).
- If `AMNP` is active, render `AmnpDiagnostics` showing the NonLinear vs Linear component layout.
- Bind all components into the main grid layout in `App.tsx`.

## Tasks

<task id="5.3.1">
<title>Develop Live Prediction Indicators</title>
<action>
1. Create `PredictionCard.tsx`.
2. Connect to `useInferenceStore((state) => state.recentPrediction)`.
3. If null, show "Awaiting Data...". If active, map `predicted_class` to dynamic classes (e.g. `bg-emerald-500` for focused, `bg-amber-500` for distracted).
4. Utilize `lucide-react` icons to reinforce state.
</action>
<acceptance_criteria>
- The primary UI metric is overtly legible and accurately matches the backend response.
</acceptance_criteria>
</task>

<task id="5.3.2">
<title>Implement Analytical Recharts</title>
<action>
1. Create `Explanations.tsx`.
2. Extract `feature_importance` dict from the active prediction. Format into a flat array of `{ name, value }`.
3. Feed into Recharts `<ResponsiveContainer><BarChart/></ResponsiveContainer>`.
4. Style the bars uniquely based on their value (gradient/color shift).
5. Ensure `App.tsx` correctly aligns the `ControlPanel`, `PredictionCard`, and `Explanations` in an aesthetically pleasing grid.
</action>
<acceptance_criteria>
- Recharts seamlessly auto-updates 10x a second without dropping frames, validating our architectural choice of Zustand for data throughput.
</acceptance_criteria>
</task>

## Verification
```bash
# Execute application stack
cd frontend && npm run dev:all
# Expected: React UI builds successfully and renders the complete dashboard without JS errors.
```
