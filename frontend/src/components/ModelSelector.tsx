import {
  useInferenceStore,
  AVAILABLE_MODELS,
  type ModelName,
} from "../store/useInferenceStore";

const MODEL_LABELS: Record<ModelName, string> = {
  AMNP: "AMNP",
  NeuralNetwork: "Neural Net",
  SVM: "SVM",
  Perceptron: "Perceptron",
};

const MODEL_ICONS: Record<ModelName, string> = {
  AMNP: "psychology",
  NeuralNetwork: "neurology",
  SVM: "bolt",
  Perceptron: "memory",
};

export function ModelSelector() {
  const activeModel = useInferenceStore((s) => s.activeModel);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);
  const setActiveModel = useInferenceStore((s) => s.setActiveModel);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {AVAILABLE_MODELS.map((model) => {
          const isActive = model === activeModel;
          return (
            <button
              key={model}
              onClick={() => setActiveModel(model)}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-all duration-200 cursor-pointer
                ${
                  isActive
                    ? "bg-primary-container text-white shadow-sm"
                    : "bg-surface-container-high text-secondary hover:bg-surface-container-highest hover:text-on-surface"
                }
              `}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {MODEL_ICONS[model]}
              </span>
              {MODEL_LABELS[model]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={`h-2 w-2 rounded-full ${
            connectionStatus === "connected"
              ? "bg-primary-container animate-pulse"
              : connectionStatus === "connecting"
                ? "bg-secondary animate-pulse"
                : connectionStatus === "error"
                  ? "bg-error"
                  : "bg-outline"
          }`}
        />
        <span className="text-xs text-secondary capitalize font-label">
          {connectionStatus === "connected"
            ? "All models active"
            : connectionStatus}
        </span>
      </div>
    </div>
  );
}
