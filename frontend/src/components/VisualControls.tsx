import { useVisualizationStore } from "../store/useVisualizationStore";
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Lightbulb,
} from "lucide-react";

export function VisualControls() {
  const currentModel = useVisualizationStore((s) => s.currentModel);
  const playbackState = useVisualizationStore((s) => s.playbackState);
  const speed = useVisualizationStore((s) => s.speed);
  const epoch = useVisualizationStore((s) => s.epoch);
  const totalEpochs = useVisualizationStore((s) => s.totalEpochs);
  const accuracy = useVisualizationStore((s) => s.accuracy);
  const loss = useVisualizationStore((s) => s.loss);
  
  const showTrueLabels = useVisualizationStore((s) => s.showTrueLabels);
  const showPredictions = useVisualizationStore((s) => s.showPredictions);
  const showBoundary = useVisualizationStore((s) => s.showBoundary);

  const connect = useVisualizationStore((s) => s.connect);
  const start = useVisualizationStore((s) => s.start);
  const pause = useVisualizationStore((s) => s.pause);
  const resume = useVisualizationStore((s) => s.resume);
  const reset = useVisualizationStore((s) => s.reset);
  const setSpeed = useVisualizationStore((s) => s.setSpeed);
  
  const setShowTrueLabels = useVisualizationStore((s) => s.setShowTrueLabels);
  const setShowPredictions = useVisualizationStore((s) => s.setShowPredictions);
  const setShowBoundary = useVisualizationStore((s) => s.setShowBoundary);

  const handleModelChange = (model: string) => {
    connect(model);
  };

  const MODELS = [
    { id: "AMNP", label: "AMNP" },
    { id: "Perceptron", label: "Perceptron" },
    { id: "NeuralNetwork", label: "Neural Net" },
    { id: "SVM", label: "SVM" },
  ];

  return (
    <div className="space-y-6">
      {/* Model Comparison Toggle */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.05em] font-medium text-on-surface-variant mb-3 block">Model Architecture</label>
        <div className="grid grid-cols-2 gap-2">
           {MODELS.map((m) => (
             <button
                key={m.id}
                onClick={() => handleModelChange(m.id)}
                className={`text-xs py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 font-bold ${
                  currentModel === m.id
                    ? "bg-primary/10 text-primary border border-primary/40 bg-[rgba(45,52,73,0.6)] backdrop-blur-sm shadow-[0_0_15px_rgba(102,221,139,0.1)]"
                    : "bg-[rgba(45,52,73,0.4)] backdrop-blur-sm text-on-surface-variant border border-outline-variant/20 hover:bg-surface-variant"
                }`}
             >
                {m.label}
             </button>
           ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 rounded-full p-2 flex justify-around items-center">
        <button 
          onClick={reset}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <RotateCcw size={20} />
        </button>
        
        {playbackState === "playing" ? (
           <button 
             onClick={pause}
             className="w-12 h-12 bg-surface-container-highest text-on-surface rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer border border-white/5 hover:border-primary border-primary/50 text-primary"
           >
             <Pause size={20} className="fill-current" />
           </button>
        ) : (
           <button 
             onClick={playbackState === "idle" || playbackState === "complete" ? start : resume}
             className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(102,221,139,0.4)] active:scale-95 transition-transform cursor-pointer"
           >
             <Play size={20} className="fill-current" />
           </button>
        )}
        
        <div className="p-2 w-9 h-9"></div> {/* Spacer for symmetry */}
      </div>

      {/* Playback Speed Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px] uppercase tracking-[0.05em] font-medium text-on-surface-variant">Training Speed</label>
          <span className="text-[10px] tabular-nums text-primary font-bold">{Math.round((500 - speed + 20)/5)}x</span>
        </div>
        <div className="relative w-full h-1.5 bg-surface-container-highest rounded-full flex items-center group">
          <input
            type="range"
            min={20}
            max={500}
            value={500 - speed + 20}
            onChange={(e) => setSpeed(500 - Number(e.target.value) + 20)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
             className="h-full bg-gradient-to-r from-primary-container to-primary shadow-[0_0_8px_rgba(102,221,139,0.5)] rounded-full transition-all" 
             style={{width: `${((500 - speed) / 480) * 100}%`}}>
          </div>
        </div>
      </div>

      {/* Live Stats Box */}
      {epoch > 0 && (
        <div className="bg-surface-container-highest rounded-xl p-4 flex flex-col gap-3 border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-[0.05em] font-medium text-on-surface-variant">Epoch</span>
            <span className="text-sm font-mono tabular-nums text-on-surface font-semibold tracking-tight">{epoch} <span className="text-on-surface-variant">/ {totalEpochs}</span></span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-[0.05em] font-medium text-on-surface-variant">Accuracy</span>
            <span className="text-sm font-mono tabular-nums text-primary font-bold tracking-tight">{(accuracy * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-[0.05em] font-medium text-on-surface-variant">Loss Rate</span>
            <span className="text-sm font-mono tabular-nums text-error font-bold tracking-tight">{loss.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Rendering Adjustments */}
      <div className="mt-2 space-y-2">
         <label className="text-[10px] uppercase tracking-[0.05em] font-medium text-on-surface-variant mb-3 block">Visualization Layers</label>
         <ToggleRow label="Show True Ground Path" active={showTrueLabels} onToggle={() => setShowTrueLabels(!showTrueLabels)} />
         <ToggleRow label="Show Network Predictions" active={showPredictions} onToggle={() => setShowPredictions(!showPredictions)} />
         <ToggleRow label="Show Contour Boundaries" active={showBoundary} onToggle={() => setShowBoundary(!showBoundary)} />
      </div>

      {/* Insight Card */}
      {epoch > 0 && accuracy > 0.95 && currentModel === "AMNP" && (
         <div className="bg-[rgba(45,52,73,0.6)] backdrop-blur-md border-l-4 border-primary rounded-xl p-4 shadow-lg shadow-primary/5">
           <div className="flex items-start gap-3">
             <Lightbulb size={16} className="text-primary flex-shrink-0 mt-0.5" />
             <p className="text-xs leading-relaxed text-on-surface-variant font-medium">Model convergence detected. AMNP asymmetrical margins safely encompass optimal behavior clusters.</p>
           </div>
         </div>
      )}
    </div>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
        active
          ? "bg-white/10 text-on-surface border border-white/10"
          : "bg-surface-container-highest text-on-surface-variant border border-transparent hover:text-on-surface"
      }`}
    >
      <span>{label}</span>
      {active ? <Eye size={14} className="text-primary drop-shadow-[0_0_5px_rgba(102,221,139,0.5)]" /> : <EyeOff size={14} className="opacity-50" />}
    </button>
  );
}
