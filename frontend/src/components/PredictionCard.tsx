import { useInferenceStore } from "../store/useInferenceStore";
import { Loader } from "lucide-react";

const STATE_CONFIG = {
  focused: {
    label: "Focused",
    glow: "rgba(102,221,139,0.3)", // primary
    bar: "from-primary to-primary-container shadow-[0_0_20px_rgba(102,221,139,0.4)]",
    textClass: "text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container",
    valueClass: "text-primary",
    bgAccent: "bg-primary"
  },
  distracted: {
    label: "Distracted",
    glow: "rgba(255,191,0,0.3)", // secondary container (amber)
    bar: "from-secondary-container to-secondary shadow-[0_0_20px_rgba(255,191,0,0.4)]",
    textClass: "text-transparent bg-clip-text bg-gradient-to-br from-secondary-container to-secondary",
    valueClass: "text-secondary-container",
    bgAccent: "bg-secondary-container"
  },
  confused: {
    label: "Confused",
    glow: "rgba(255,180,171,0.3)", // error
    bar: "from-error to-error-container shadow-[0_0_20px_rgba(255,180,171,0.4)]",
    textClass: "text-transparent bg-clip-text bg-gradient-to-br from-error to-error-container",
    valueClass: "text-error",
    bgAccent: "bg-error"
  },
};

export function PredictionCard() {
  const prediction = useInferenceStore((s) => s.currentPrediction);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  if (connectionStatus !== "connected" || !prediction) {
    return (
      <div className="rounded-[2rem] bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 p-8 md:p-12 relative flex flex-col items-center justify-center min-h-[400px]">
        <Loader size={32} className="text-on-surface-variant animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
          {connectionStatus === "connected"
            ? "Awaiting Telemetry Stream…"
            : "Connect to a model to begin"}
        </p>
      </div>
    );
  }

  const config = STATE_CONFIG[prediction.predicted_class];
  const confidencePercent = (prediction.confidence * 100).toFixed(1);

  return (
    <div className="rounded-[2rem] bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 p-8 md:p-12 relative overflow-hidden flex flex-col justify-center min-h-[400px]">
      {/* Decorative Glow Background */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 blur-[100px] rounded-full"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {prediction.model_name}
          </span>
          <span className="text-on-surface-variant text-[10px] font-medium uppercase tracking-widest">
            Live Stream
          </span>
        </div>
        
        <h2 className="text-on-surface-variant text-sm font-bold uppercase tracking-[0.2em] mb-2">
          Detected Behavioral State
        </h2>
        
        <div className="flex items-baseline gap-4 mb-8">
          <span 
            className={`text-6xl md:text-8xl font-black ${config.textClass}`}
            style={{ filter: `drop-shadow(0 0 15px ${config.glow})` }}
          >
            {config.label}
          </span>
          <div className="flex flex-col ml-4">
            <span className={`text-3xl font-bold tabular-nums ${config.valueClass}`}>
              {confidencePercent}%
            </span>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
              Confidence
            </span>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="w-full h-4 bg-surface-container-lowest rounded-full overflow-hidden mb-12 flex">
          <div 
            className={`h-full bg-gradient-to-r ${config.bar} transition-all duration-300`} 
            style={{ width: `${prediction.confidence * 100}%` }}
          />
        </div>

        {/* Probability Readouts Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(prediction.probabilities).map(([cls, prob]) => {
            const pConfig = STATE_CONFIG[cls as keyof typeof STATE_CONFIG];
            const probPercent = (prob * 100).toFixed(1);
            return (
              <div key={cls} className="p-4 bg-white/5 rounded-2xl border-l-4 border-transparent hover:border-surface-variant transition-colors" style={{ borderLeftColor: cls === prediction.predicted_class ? 'var(--color-primary)' : 'transparent' }}>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                   {cls}
                </p>
                <div className="flex justify-between items-end">
                  <span className="text-lg font-bold text-on-surface">Probability</span>
                  <span className={`text-sm font-medium tabular-nums ${pConfig.valueClass}`}>
                    {probPercent}%
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container-lowest mt-2 rounded-full overflow-hidden">
                  <div className={`h-full ${pConfig.bgAccent} transition-all duration-300`} style={{ width: `${prob * 100}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
