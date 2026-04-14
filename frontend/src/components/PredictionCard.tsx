import {
  useInferenceStore,
  AVAILABLE_MODELS,
  type ModelName,
  type PredictionOutput,
} from "../store/useInferenceStore";

const STATE_CONFIG = {
  focused: {
    label: "Focused",
    barColor: "bg-primary-container",
    textClass: "text-primary-container",
    probBg: "bg-primary-container",
  },
  distracted: {
    label: "Distracted",
    barColor: "bg-secondary",
    textClass: "text-secondary",
    probBg: "bg-secondary",
  },
  confused: {
    label: "Confused",
    barColor: "bg-error",
    textClass: "text-error",
    probBg: "bg-error",
  },
};

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

/* ── Single model mini-card ── */
function ModelMiniCard({
  prediction,
  modelName,
  isActive,
  onSelect,
}: {
  prediction: PredictionOutput;
  modelName: ModelName;
  isActive: boolean;
  onSelect: () => void;
}) {
  const config = STATE_CONFIG[prediction.predicted_class];
  let confidencePercent = (prediction.confidence * 100).toFixed(1);
  if (confidencePercent === "100.0") {
    confidencePercent = ">99.9";
  }

  return (
    <button
      onClick={onSelect}
      className={`
        relative rounded-lg p-6 text-left transition-all duration-300 cursor-pointer group
        bg-white border overflow-hidden
        hover:shadow-md hover:-translate-y-0.5
        ${
          isActive
            ? "border-primary-container/30 shadow-sm"
            : "border-outline-variant/10 hover:border-outline-variant/30"
        }
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-container animate-pulse" />
      )}

      <div className="relative z-10">
        {/* Model Header */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              isActive
                ? "bg-primary-container/10 text-primary-container"
                : "bg-surface-container-highest text-secondary"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {MODEL_ICONS[modelName]}
            </span>
            {MODEL_LABELS[modelName]}
          </span>
        </div>

        {/* Predicted Class */}
        <div className={`text-3xl font-headline italic mb-1 ${config.textClass}`}>
          {config.label}
        </div>

        {/* Confidence */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className={`text-xl font-bold tabular-nums ${config.textClass}`}>
            {confidencePercent}%
          </span>
          <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">
            confidence
          </span>
        </div>

        {/* Confidence Bar */}
        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mb-4">
          <div
            className={`h-full ${config.barColor} transition-all duration-300`}
            style={{ width: `${prediction.confidence * 100}%` }}
          />
        </div>

        {/* Mini probability breakdown */}
        <div className="flex gap-3">
          {Object.entries(prediction.probabilities).map(([cls, prob]) => {
            const pConfig = STATE_CONFIG[cls as keyof typeof STATE_CONFIG];
            return (
              <div key={cls} className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[8px] font-bold text-secondary uppercase tracking-tight truncate">
                    {cls.slice(0, 3)}
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums ${pConfig.textClass}`}>
                    {(prob * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pConfig.probBg} transition-all duration-300`}
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}

/* ── Main Comparison Grid ── */
export function PredictionCard() {
  const allPredictions = useInferenceStore((s) => s.allPredictions);
  const activeModel = useInferenceStore((s) => s.activeModel);
  const setActiveModel = useInferenceStore((s) => s.setActiveModel);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  if (connectionStatus !== "connected" || !allPredictions) {
    return (
      <div className="rounded-lg bg-surface-container-high p-12 flex flex-col items-center justify-center min-h-[300px]">
        <span className="material-symbols-outlined text-secondary text-4xl mb-4 animate-spin">
          progress_activity
        </span>
        <p className="text-sm font-bold uppercase tracking-widest text-secondary">
          {connectionStatus === "connected"
            ? "Awaiting Telemetry Stream…"
            : "Connecting to all models…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-headline text-3xl italic text-primary">
          Precision Slates
        </h4>
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
          <span className="w-2 h-2 bg-primary-container rounded-full animate-pulse" />
          4 models active
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_MODELS.map((modelName) => {
          const prediction = allPredictions[modelName];
          if (!prediction) return null;
          return (
            <ModelMiniCard
              key={modelName}
              prediction={prediction}
              modelName={modelName}
              isActive={modelName === activeModel}
              onSelect={() => setActiveModel(modelName)}
            />
          );
        })}
      </div>
    </div>
  );
}
