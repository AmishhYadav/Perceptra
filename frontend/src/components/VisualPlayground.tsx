import { useEffect } from "react";
import { TrainingCanvas } from "./TrainingCanvas";
import { VisualControls } from "./VisualControls";
import { useVisualizationStore } from "../store/useVisualizationStore";

export function VisualPlayground() {
  const connect = useVisualizationStore((s) => s.connect);
  const disconnect = useVisualizationStore((s) => s.disconnect);
  const currentModel = useVisualizationStore((s) => s.currentModel);
  const playbackState = useVisualizationStore((s) => s.playbackState);
  const epoch = useVisualizationStore((s) => s.epoch);
  const totalEpochs = useVisualizationStore((s) => s.totalEpochs);
  const accuracy = useVisualizationStore((s) => s.accuracy);
  const loss = useVisualizationStore((s) => s.loss);

  // Auto-connect on mount
  useEffect(() => {
    connect(currentModel);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-secondary font-label text-xs tracking-widest uppercase">
            Training Live View
          </span>
          <h1 className="text-5xl font-headline italic text-primary mt-2">
            Latent Space Synthesis
          </h1>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-secondary text-[10px] uppercase tracking-widest">
              Status
            </p>
            <p className="text-2xl font-headline text-on-tertiary-container flex items-center gap-2">
              {playbackState === "playing" && (
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container animate-pulse" />
              )}
              <span className="capitalize">{playbackState}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Data Visualization Area */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Scatter Plot Container */}
          <div className="relative bg-surface-container-low rounded-lg p-8 overflow-hidden" style={{aspectRatio: "16/9"}}>
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(#163429 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Axis Labels */}
            <div className="absolute left-4 top-1/2 -rotate-90 text-[10px] uppercase tracking-[0.3em] text-outline">
              Hesitation Time
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-outline">
              Click Frequency
            </div>

            {/* Legend */}
            <div className="absolute top-6 right-6 flex gap-4 z-10 text-[10px] uppercase tracking-widest font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary-container" />
                Focused
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-secondary" />
                Distracted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-error" />
                Confused
              </span>
            </div>

            <div className="w-full h-full p-8">
              <TrainingCanvas width={800} height={450} />
            </div>
          </div>

          {/* Training Metrics Grid */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Epochs
              </h4>
              <p className="text-4xl font-headline italic text-primary">
                {epoch}
                <span className="text-lg font-body italic text-secondary ml-1">
                  / {totalEpochs}
                </span>
              </p>
              <div className="mt-4 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="bg-primary-container h-full transition-all"
                  style={{
                    width: `${totalEpochs > 0 ? (epoch / totalEpochs) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Accuracy
              </h4>
              <p className="text-4xl font-headline italic text-primary">
                {(accuracy * 100).toFixed(2)}
                <span className="text-lg font-body italic text-secondary ml-1">
                  %
                </span>
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Current Loss
              </h4>
              <p className="text-4xl font-headline italic text-primary">
                {loss.toFixed(4)}
              </p>
              <p className="mt-2 text-[10px] text-on-tertiary-container font-medium uppercase tracking-tighter">
                {loss < 0.1 ? "Converging" : "Training"}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-outline-variant/5">
              <h4 className="text-secondary text-[10px] uppercase tracking-widest mb-1">
                Model
              </h4>
              <p className="text-2xl font-headline italic text-primary">
                {currentModel}
              </p>
              <p className="mt-2 text-[10px] text-secondary font-medium uppercase tracking-tighter">
                Active Architecture
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Controls Panel */}
          <div className="bg-white rounded-lg p-8 shadow-sm border border-outline-variant/5">
            <h3 className="text-secondary text-[10px] uppercase tracking-widest mb-6">
              Training Controls
            </h3>
            <VisualControls />
          </div>

          {/* Architecture Overview */}
          <div className="bg-surface-container-high rounded-lg p-8">
            <h3 className="text-secondary text-[10px] uppercase tracking-widest mb-6">
              Model Architecture
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded text-white">
                  <span className="material-symbols-outlined text-sm">input</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Input Layer</p>
                  <p className="text-[10px] text-secondary">8 Behavioral Features</p>
                </div>
              </div>
              <div className="ml-5 h-8 w-px bg-outline-variant" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-on-tertiary-container/10 border border-on-tertiary-container/20 flex items-center justify-center rounded text-on-tertiary-container">
                  <span className="material-symbols-outlined text-sm">layers</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Hidden Layers</p>
                  <p className="text-[10px] text-secondary">Neural Transformation</p>
                </div>
              </div>
              <div className="ml-5 h-8 w-px bg-outline-variant" />
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded text-white shadow-lg shadow-primary-container/20">
                  <span className="material-symbols-outlined text-sm">output</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">Classification Head</p>
                  <p className="text-[10px] text-secondary">3 Classes: Focused / Distracted / Confused</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
