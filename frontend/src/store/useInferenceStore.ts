/**
 * Zustand store for real-time WebSocket inference state.
 *
 * Connects to the /ws/inference/all endpoint and receives predictions
 * from ALL 4 models simultaneously on every telemetry frame.
 * Components can subscribe with fine-grained selectors.
 *
 * Predictions are EMA-smoothed so confidence scores converge
 * instead of flickering on every frame.
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

/* ── EMA Smoothing ──
 * Alpha controls how much weight new data gets vs. the previous smoothed value.
 *   alpha=0.3 → 30% new, 70% previous → smooth convergence over ~5 frames
 *   At 2Hz send rate, that's ~2.5 seconds to converge to a new steady state.
 */
const EMA_ALPHA = 0.3;

function smoothAllPredictions(
  prev: Record<ModelName, PredictionOutput> | null,
  next: Record<ModelName, PredictionOutput>,
): Record<ModelName, PredictionOutput> {
  if (!prev) return next;

  const smoothed = {} as Record<string, PredictionOutput>;

  for (const [modelName, prediction] of Object.entries(next)) {
    const prevPred = prev[modelName as ModelName];
    if (!prevPred) {
      smoothed[modelName] = prediction;
      continue;
    }

    // EMA-smooth probabilities
    const smoothedProbs: Record<string, number> = {};
    for (const [cls, prob] of Object.entries(prediction.probabilities)) {
      const prevProb = prevPred.probabilities[cls] ?? prob;
      smoothedProbs[cls] = EMA_ALPHA * prob + (1 - EMA_ALPHA) * prevProb;
    }

    // Derive predicted class and confidence from smoothed probabilities
    let maxClass = prediction.predicted_class;
    let maxProb = 0;
    for (const [cls, prob] of Object.entries(smoothedProbs)) {
      if (prob > maxProb) {
        maxProb = prob;
        maxClass = cls as PredictionOutput["predicted_class"];
      }
    }

    smoothed[modelName] = {
      ...prediction,
      predicted_class: maxClass,
      confidence: maxProb,
      probabilities: smoothedProbs,
    };
  }

  return smoothed as Record<ModelName, PredictionOutput>;
}

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
  _reconnectTimer: null as ReturnType<typeof setTimeout> | null,
  _reconnectAttempt: 0,

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

    // NOTE: We intentionally do NOT clear allPredictions here.
    // Predictions should persist across reconnects so they don't "vanish"
    // when the socket briefly drops. New data will overwrite when it arrives.
    set({
      connectionStatus: "connecting",
      ws: null,
    });

    const socket = new WebSocket(`${WS_BASE}/all`);

    socket.onopen = () => {
      set({ connectionStatus: "connected", ws: socket });
      // Reset reconnect counter on successful connection
      (get() as any)._reconnectAttempt = 0;
      console.log("[Perceptra] WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Check it's a multi-model response (has model name keys)
        if (data.AMNP || data.NeuralNetwork || data.SVM || data.Perceptron) {
          const rawPreds = data as Record<ModelName, PredictionOutput>;
          const { activeModel, allPredictions: prevPreds } = get();

          // EMA-smooth predictions so confidence scores converge
          // instead of flickering on every frame
          const smoothedPreds = smoothAllPredictions(prevPreds, rawPreds);

          set({
            allPredictions: smoothedPreds,
            currentPrediction: smoothedPreds[activeModel] || null,
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
      // NOTE: We do NOT clear allPredictions here — they should persist
      // so the user still sees results after the game ends even if
      // the socket closes.
      set({ connectionStatus: "disconnected", ws: null });
      console.log("[Perceptra] WebSocket disconnected");

      // Auto-reconnect with exponential backoff (1s → 2s → 4s → ... max 10s)
      const state = get() as any;
      const attempt = state._reconnectAttempt || 0;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`[Perceptra] Reconnecting in ${delay}ms (attempt ${attempt + 1})...`);
      const timer = setTimeout(() => {
        (get() as any)._reconnectAttempt = attempt + 1;
        get().connectAll();
      }, delay);
      (get() as any)._reconnectTimer = timer;
    };
  },

  disconnect: () => {
    const state = get() as any;
    // Cancel any pending reconnect
    if (state._reconnectTimer) {
      clearTimeout(state._reconnectTimer);
      state._reconnectTimer = null;
    }
    const { ws } = get();
    if (ws) {
      ws.onclose = null; // prevent auto-reconnect from firing
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
