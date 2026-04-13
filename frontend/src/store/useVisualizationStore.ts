/**
 * Zustand store for training visualization WebSocket state.
 *
 * Manages playback, model selection, scatter data, boundary grids,
 * and display toggles for the Visual tab.
 */
import { create } from "zustand";

/* ── Types ── */

export interface DataPoint {
  x: number;
  y: number;
  trueLabel: number;
}

export interface BoundaryGrid {
  x_range: [number, number];
  y_range: [number, number];
  grid_size: number;
  probabilities: number[][]; // (grid_size^2) × 3
}

export interface EpochFrame {
  epoch: number;
  totalEpochs: number;
  predictions: number[];
  accuracy: number;
  loss: number;
  boundary: BoundaryGrid | null;
}

export type PlaybackState = "idle" | "playing" | "paused" | "complete";
export type ViewMode = "single" | "multi";

const VIS_WS_BASE =
  import.meta.env.VITE_WS_BASE_URL?.replace("/inference", "/visualization") ||
  "ws://localhost:8000/ws/visualization";

interface VisualizationState {
  // Data
  points: DataPoint[];
  classes: string[];
  xRange: [number, number];
  yRange: [number, number];
  gridSize: number;
  xAxisLabel: string;
  yAxisLabel: string;

  // Per-model state
  currentModel: string;
  predictions: number[];
  boundary: BoundaryGrid | null;
  epoch: number;
  totalEpochs: number;
  accuracy: number;
  loss: number;
  accuracyHistory: number[];
  lossHistory: number[];

  // Playback
  playbackState: PlaybackState;
  speed: number; // ms between epochs
  viewMode: ViewMode;

  // Display toggles
  showTrueLabels: boolean;
  showPredictions: boolean;
  showBoundary: boolean;

  // WebSocket
  ws: WebSocket | null;

  // Actions
  connect: (model: string) => void;
  disconnect: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (ms: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowTrueLabels: (v: boolean) => void;
  setShowPredictions: (v: boolean) => void;
  setShowBoundary: (v: boolean) => void;
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
  points: [],
  classes: [],
  xRange: [-4, 4],
  yRange: [-4, 4],
  gridSize: 50,
  xAxisLabel: "Click Frequency",
  yAxisLabel: "Hesitation Time",

  currentModel: "AMNP",
  predictions: [],
  boundary: null,
  epoch: 0,
  totalEpochs: 100,
  accuracy: 0,
  loss: 0,
  accuracyHistory: [],
  lossHistory: [],

  playbackState: "idle",
  speed: 80,
  viewMode: "single",

  showTrueLabels: false,
  showPredictions: true,
  showBoundary: true,

  ws: null,

  connect: (model: string) => {
    const { ws: oldWs } = get();
    if (oldWs) {
      // Detach onclose handler to prevent it from nullifying the new ws
      oldWs.onclose = null;
      oldWs.onmessage = null;
      oldWs.close();
    }

    set({
      currentModel: model,
      playbackState: "idle",
      points: [],
      predictions: [],
      boundary: null,
      epoch: 0,
      accuracy: 0,
      loss: 0,
      accuracyHistory: [],
      lossHistory: [],
      xAxisLabel: "Click Frequency",
      yAxisLabel: "Hesitation Time",
      ws: null,
    });

    // Small delay to let old connection close cleanly on the server side
    setTimeout(() => {
      const socket = new WebSocket(`${VIS_WS_BASE}/${model}`);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "init") {
            set({
              points: data.points.map(
                (p: { x: number; y: number; true_label: number }) => ({
                  x: p.x,
                  y: p.y,
                  trueLabel: p.true_label,
                }),
              ),
              classes: data.classes,
              xRange: data.x_range,
              yRange: data.y_range,
              gridSize: data.grid_size,
              totalEpochs: data.total_epochs,
              xAxisLabel: data.x_axis_label || "Click Frequency",
              yAxisLabel: data.y_axis_label || "Hesitation Time",
            });
          }

          if (data.type === "epoch") {
            const state = get();
            set({
              epoch: data.epoch,
              totalEpochs: data.total_epochs,
              predictions: data.predictions,
              accuracy: data.accuracy,
              loss: data.loss,
              boundary: data.boundary || state.boundary,
              accuracyHistory: [...state.accuracyHistory, data.accuracy],
              lossHistory: [...state.lossHistory, data.loss],
            });
          }

          if (data.type === "complete") {
            set({ playbackState: "complete" });
          }

          if (data.type === "reset") {
            set({
              playbackState: "idle",
              predictions: [],
              boundary: null,
              epoch: 0,
              accuracy: 0,
              loss: 0,
              accuracyHistory: [],
              lossHistory: [],
            });
          }
        } catch {
          // ignore bad frames
        }
      };

      socket.onclose = () => {
        // Only null out ws if this is still the current socket
        const current = get().ws;
        if (current === socket) {
          set({ ws: null });
        }
      };

      set({ ws: socket });
    }, 100);
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) ws.close();
    set({ ws: null, playbackState: "idle" });
  },

  start: () => {
    const { ws, speed } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    set({
      playbackState: "playing",
      predictions: [],
      boundary: null,
      epoch: 0,
      accuracy: 0,
      loss: 0,
      accuracyHistory: [],
      lossHistory: [],
    });
    ws.send(JSON.stringify({ action: "speed", value: speed }));
    ws.send(JSON.stringify({ action: "start" }));
  },

  pause: () => {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    set({ playbackState: "paused" });
    ws.send(JSON.stringify({ action: "pause" }));
  },

  resume: () => {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    set({ playbackState: "playing" });
    ws.send(JSON.stringify({ action: "resume" }));
  },

  reset: () => {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ action: "reset" }));
  },

  setSpeed: (ms: number) => {
    const { ws } = get();
    set({ speed: ms });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "speed", value: ms }));
    }
  },

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setShowTrueLabels: (v: boolean) => set({ showTrueLabels: v }),
  setShowPredictions: (v: boolean) => set({ showPredictions: v }),
  setShowBoundary: (v: boolean) => set({ showBoundary: v }),
}));
