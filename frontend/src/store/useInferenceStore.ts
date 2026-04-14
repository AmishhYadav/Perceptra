/**
 * Zustand store for real-time WebSocket inference state.
 *
 * Connects to the /ws/inference/all endpoint and receives predictions
 * from ALL 4 models simultaneously on every telemetry frame.
 * Components can subscribe with fine-grained selectors.
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
    margin_satisfaction?: number;
    nonlinear_importance?: Record<string, number>;
    linear_importance?: Record<string, number>;
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
  /** The model highlighted for detail view (Explanations panel) */
  activeModel: ModelName;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  /** Predictions from ALL models, keyed by model name */
  allPredictions: Record<ModelName, PredictionOutput> | null;
  /** Legacy single-model accessor for components that only need the active one */
  currentPrediction: PredictionOutput | null;
  ws: WebSocket | null;

  /** Connect a single WebSocket to /ws/inference/all */
  connectAll: () => void;
  disconnect: () => void;
  sendTelemetry: (payload: TelemetryInput) => void;
  /** Switch which model is highlighted in the detail panel */
  setActiveModel: (model: ModelName) => void;
  clearPredictions: () => void;
}

export const useInferenceStore = create<InferenceState>((set, get) => ({
  activeModel: "AMNP",
  connectionStatus: "disconnected",
  allPredictions: null,
  currentPrediction: null,
  ws: null,

  connectAll: () => {
    // Prevent duplicate connections (React StrictMode double-mount, etc.)
    const { ws: existingWs } = get();
    if (existingWs && (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING)) {
      return; // already connected or connecting
    }

    // Tear down existing dead connection cleanly
    if (existingWs) {
      existingWs.onclose = null;
      existingWs.onerror = null;
      existingWs.onmessage = null;
      existingWs.close();
    }

    set({
      connectionStatus: "connecting",
      allPredictions: null,
      currentPrediction: null,
      ws: null,
    });

    const socket = new WebSocket(`${WS_BASE}/all`);

    socket.onopen = () => {
      set({ connectionStatus: "connected", ws: socket });
      console.log("[Perceptra] WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Check it's a multi-model response (has model name keys)
        if (data.AMNP || data.NeuralNetwork || data.SVM || data.Perceptron) {
          const allPreds = data as Record<ModelName, PredictionOutput>;
          const { activeModel } = get();
          set({
            allPredictions: allPreds,
            currentPrediction: allPreds[activeModel] || null,
          });
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
      console.log("[Perceptra] WebSocket disconnected");
    };
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.onclose = null; // prevent any stale handlers
      ws.close();
    }
    set({
      ws: null,
      connectionStatus: "disconnected",
      allPredictions: null,
      currentPrediction: null,
    });
  },

  clearPredictions: () => {
    set({ allPredictions: null, currentPrediction: null });
  },

  sendTelemetry: (payload: TelemetryInput) => {
    const { ws } = get();
    // Use readyState directly — more reliable than our connectionStatus flag
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  },

  setActiveModel: (model: ModelName) => {
    const { allPredictions } = get();
    set({
      activeModel: model,
      currentPrediction: allPredictions ? allPredictions[model] || null : null,
    });
  },
}));

