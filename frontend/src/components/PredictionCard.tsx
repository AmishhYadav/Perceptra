import { useInferenceStore } from '../store/useInferenceStore';
import { Focus, AlertTriangle, HelpCircle, Loader } from 'lucide-react';

const STATE_CONFIG = {
  focused: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/20',
    icon: <Focus size={32} />,
    label: 'Focused',
  },
  distracted: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20',
    icon: <AlertTriangle size={32} />,
    label: 'Distracted',
  },
  confused: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    icon: <HelpCircle size={32} />,
    label: 'Confused',
  },
};

export function PredictionCard() {
  const prediction = useInferenceStore((s) => s.currentPrediction);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  if (connectionStatus !== 'connected' || !prediction) {
    return (
      <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Loader size={24} className="text-gray-500 animate-spin mb-3" />
        <p className="text-sm text-gray-500">
          {connectionStatus === 'connected' ? 'Awaiting predictions…' : 'Connect to a model to begin'}
        </p>
      </div>
    );
  }

  const config = STATE_CONFIG[prediction.predicted_class];
  const confidence = (prediction.confidence * 100).toFixed(1);

  return (
    <div
      className={`
        rounded-2xl backdrop-blur-sm border p-6 transition-all duration-300
        ${config.bg} ${config.border} shadow-lg ${config.glow}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`${config.text}`}>{config.icon}</div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {prediction.model_name}
        </span>
      </div>

      {/* Main label */}
      <h2 className={`text-3xl font-bold ${config.text} mb-1`}>{config.label}</h2>
      <p className="text-gray-400 text-sm">Behavioral State</p>

      {/* Confidence bar */}
      <div className="mt-5">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Confidence</span>
          <span className={`font-mono font-semibold ${config.text}`}>{confidence}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-lighter overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${config.text.replace('text-', 'bg-')}`}
            style={{ width: `${prediction.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Probability breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Object.entries(prediction.probabilities).map(([cls, prob]) => {
          const pConfig = STATE_CONFIG[cls as keyof typeof STATE_CONFIG];
          return (
            <div key={cls} className="text-center">
              <div className={`text-lg font-bold font-mono ${pConfig.text}`}>
                {(prob * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-gray-500 uppercase">{pConfig.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
