/**
 * VisualControls — model selector, playback buttons, speed slider, and display toggles.
 */
import { useVisualizationStore } from "../store/useVisualizationStore";
import {
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";

const MODELS = ["AMNP", "NeuralNetwork", "SVM", "Perceptron"] as const;

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

  const progressPct =
    totalEpochs > 0 ? Math.round((epoch / totalEpochs) * 100) : 0;

  return (
    <div className="bg-surface-light/60 backdrop-blur-md rounded-2xl border border-white/5 p-5 space-y-5">
      {/* Model Selector */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Model
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MODELS.map((m) => (
            <button
              key={m}
              onClick={() => handleModelChange(m)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentModel === m
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-surface-lighter/50 text-gray-400 border border-white/5 hover:text-gray-200 hover:border-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Playback
        </h3>
        <div className="flex gap-2">
          {playbackState === "idle" || playbackState === "complete" ? (
            <button
              onClick={start}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-focused/20 text-focused border border-focused/30 hover:bg-focused/30 transition-all text-sm font-semibold"
            >
              <Play size={16} />
              {playbackState === "complete" ? "Replay" : "Start"}
            </button>
          ) : playbackState === "playing" ? (
            <button
              onClick={pause}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-distracted/20 text-distracted border border-distracted/30 hover:bg-distracted/30 transition-all text-sm font-semibold"
            >
              <Pause size={16} />
              Pause
            </button>
          ) : (
            <button
              onClick={resume}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-focused/20 text-focused border border-focused/30 hover:bg-focused/30 transition-all text-sm font-semibold"
            >
              <Play size={16} />
              Resume
            </button>
          )}
          <button
            onClick={reset}
            className="px-3 py-2.5 rounded-lg bg-surface-lighter/50 text-gray-400 border border-white/5 hover:text-white hover:border-white/10 transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Speed Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge size={12} />
            Speed
          </h3>
          <span className="text-[10px] text-gray-500 font-mono">{speed}ms</span>
        </div>
        <input
          type="range"
          min={20}
          max={500}
          value={500 - speed + 20}
          onChange={(e) => setSpeed(500 - Number(e.target.value) + 20)}
          className="w-full h-1.5 rounded-full appearance-none bg-surface-lighter cursor-pointer accent-accent"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-gray-600">Slow</span>
          <span className="text-[9px] text-gray-600">Fast</span>
        </div>
      </div>

      {/* Display Toggles */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Layers size={12} />
          Display
        </h3>
        <div className="space-y-2">
          <ToggleRow
            label="True Labels"
            active={showTrueLabels}
            onToggle={() => setShowTrueLabels(!showTrueLabels)}
          />
          <ToggleRow
            label="Predictions"
            active={showPredictions}
            onToggle={() => setShowPredictions(!showPredictions)}
          />
          <ToggleRow
            label="Boundary"
            active={showBoundary}
            onToggle={() => setShowBoundary(!showBoundary)}
          />
        </div>
      </div>

      {/* Progress Stats */}
      {epoch > 0 && (
        <div className="bg-surface/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              Progress
            </span>
            <span className="text-xs font-mono text-gray-300">
              {epoch}/{totalEpochs}
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-focused rounded-full transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[9px] text-gray-500 uppercase">
                Accuracy
              </span>
              <p className="text-lg font-bold text-focused">
                {(accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 uppercase">Loss</span>
              <p className="text-lg font-bold text-distracted">
                {loss.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Classes
        </h3>
        <div className="space-y-1.5">
          {[
            { label: "Focused", color: "bg-focused" },
            { label: "Distracted", color: "bg-distracted" },
            { label: "Confused", color: "bg-confused" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${c.color}`} />
              <span className="text-xs text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Toggle row component ── */
function ToggleRow({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
        active
          ? "bg-white/5 text-gray-200"
          : "bg-transparent text-gray-500 hover:text-gray-400"
      }`}
    >
      <span>{label}</span>
      {active ? (
        <Eye size={14} className="text-accent" />
      ) : (
        <EyeOff size={14} />
      )}
    </button>
  );
}
