/**
 * Zustand store for real-time WebSocket inference state.
 *
 * Manages the active model, WebSocket lifecycle, outgoing telemetry,
 * and incoming prediction results — all in a single flat store that
 * components can subscribe to with fine-grained selectors.
 */
import { create } from "zustand";

/* ── TypeScript contracts (mirrors src/api/schemas.py) ── */

export interface TelemetryInput {
  click_frequency: number;
  hesitation_time: number;
  misclick_rate: number;
  scroll_depth: number;
  movement_smoothness: number;
  dwell_time: number;
  navigation_speed: number;
  direction_changes: number;
}

export interface PredictionOutput {
  model_name: string;
  predicted_class: "focused" | "distracted" | "confused";
  confidence: number;
  probabilities: Record<string, number>;
  feature_importance: Record<string, number>;
  extras?: {
    component_weights?: { nonlinear_weight: number; linear_weight: number };
    mean_margin?: number;
  };
}

export const AVAILABLE_MODELS = [
  "AMNP",
  "NeuralNetwork",
  "SVM",
  "Perceptron",
] as const;
export type ModelName = (typeof AVAILABLE_MODELS)[number];

export const FEATURE_KEYS: (keyof TelemetryInput)[] = [
  "click_frequency",
  "hesitation_time",
  "misclick_rate",
  "scroll_depth",
  "movement_smoothness",
  "dwell_time",
  "navigation_speed",
  "direction_changes",
];

const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000/ws/inference";

/* ── Store shape ── */

interface InferenceState {
  activeModel: ModelName;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  currentPrediction: PredictionOutput | null;
  ws: WebSocket | null;

  connectToModel: (model: ModelName) => void;
  disconnect: () => void;
  sendTelemetry: (payload: TelemetryInput) => void;
}

export const useInferenceStore = create<InferenceState>((set, get) => ({
  activeModel: "AMNP",
  connectionStatus: "disconnected",
  currentPrediction: null,
  ws: null,

  connectToModel: (model: ModelName) => {
    // Tear down existing connection
    const { ws } = get();
    if (ws) {
      ws.close();
    }

    set({
      activeModel: model,
      connectionStatus: "connecting",
      currentPrediction: null,
    });

    const socket = new WebSocket(`${WS_BASE}/${model}`);

    socket.onopen = () => {
      set({ connectionStatus: "connected", ws: socket });
    };

    socket.onmessage = (event) => {
      try {
        const data: PredictionOutput = JSON.parse(event.data);
        if (data.predicted_class) {
          set({ currentPrediction: data });
        }
      } catch {
        // ignore malformed frames
      }
    };

    socket.onerror = () => {
      set({ connectionStatus: "error" });
    };

    socket.onclose = () => {
      set({ connectionStatus: "disconnected", ws: null });
    };

    // Store early so sendTelemetry can use it while connecting
    set({ ws: socket });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) ws.close();
    set({
      ws: null,
      connectionStatus: "disconnected",
      currentPrediction: null,
    });
  },

  sendTelemetry: (payload: TelemetryInput) => {
    const { ws, connectionStatus } = get();
    if (ws && connectionStatus === "connected") {
      ws.send(JSON.stringify(payload));
    }
  },
}));
