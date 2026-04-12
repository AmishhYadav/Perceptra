import {
  useInferenceStore,
  AVAILABLE_MODELS,
  type ModelName,
} from "../store/useInferenceStore";
import { Brain, Cpu, CircuitBoard, Zap } from "lucide-react";

const MODEL_ICONS: Record<ModelName, React.ReactNode> = {
  AMNP: <Brain size={18} />,
  NeuralNetwork: <CircuitBoard size={18} />,
  SVM: <Zap size={18} />,
  Perceptron: <Cpu size={18} />,
};

const MODEL_LABELS: Record<ModelName, string> = {
  AMNP: "AMNP",
  NeuralNetwork: "Neural Net",
  SVM: "SVM",
  Perceptron: "Perceptron",
};

export function ModelSelector() {
  const activeModel = useInferenceStore((s) => s.activeModel);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);
  const connectToModel = useInferenceStore((s) => s.connectToModel);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Active Model
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_MODELS.map((model) => {
          const isActive = model === activeModel;
          return (
            <button
              key={model}
              onClick={() => connectToModel(model)}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-all duration-200 cursor-pointer
                ${
                  isActive
                    ? "bg-accent/20 text-accent ring-1 ring-accent/40 shadow-lg shadow-accent/10"
                    : "bg-surface-lighter/50 text-gray-400 hover:bg-surface-lighter hover:text-gray-200"
                }
              `}
            >
              {MODEL_ICONS[model]}
              {MODEL_LABELS[model]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={`h-2 w-2 rounded-full ${
            connectionStatus === "connected"
              ? "bg-emerald-400 animate-pulse"
              : connectionStatus === "connecting"
                ? "bg-amber-400 animate-pulse"
                : connectionStatus === "error"
                  ? "bg-red-400"
                  : "bg-gray-500"
          }`}
        />
        <span className="text-xs text-gray-500 capitalize">
          {connectionStatus}
        </span>
      </div>
    </div>
  );
}
