import { useEffect } from "react";
import { TrainingCanvas } from "./TrainingCanvas";
import { VisualControls } from "./VisualControls";
import { useVisualizationStore } from "../store/useVisualizationStore";
import { Activity } from "lucide-react";

export function VisualPlayground() {
  const connect = useVisualizationStore((s) => s.connect);
  const disconnect = useVisualizationStore((s) => s.disconnect);
  const currentModel = useVisualizationStore((s) => s.currentModel);
  const playbackState = useVisualizationStore((s) => s.playbackState);

  // Auto-connect on mount
  useEffect(() => {
    connect(currentModel);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full h-[calc(100vh-160px)] min-h-[600px] border border-outline-variant/15 rounded-2xl overflow-hidden bg-surface-container-lowest">
      {/* Sidebar: Controls */}
      <aside className="w-full md:w-80 bg-surface-container-low p-6 flex flex-col gap-6 overflow-y-auto shrink-0 md:border-r md:border-outline-variant/15">
        <VisualControls />
      </aside>

      {/* Canvas Area */}
      <section className="flex-1 relative bg-surface-dim grid-overlay min-h-[400px] flex items-center justify-center overflow-hidden" style={{
          backgroundImage: "radial-gradient(circle, rgba(69, 70, 82, 0.2) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
      }}>
         {/* Top Overlay Label */}
         <div className="absolute top-6 left-6 flex flex-col gap-1 z-10">
           <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-on-surface tracking-tight">Active Training Space</h2>
              {playbackState === "playing" && <Activity size={14} className="text-primary animate-pulse" />}
           </div>
           <p className="text-[10px] text-on-surface-variant uppercase tracking-widest tabular-nums font-mono">PCA Transform</p>
         </div>

         {/* Translucent Legend */}
         <div className="absolute bottom-6 right-6 bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border-t border-l border-outline-variant/20 rounded-xl p-4 flex flex-col gap-3 z-10">
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(102,221,139,0.5)]"></div>
             <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Class: Focused</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(255,226,171,0.5)]"></div>
             <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Class: Distracted</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-error shadow-[0_0_8px_rgba(255,180,171,0.5)]"></div>
             <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Class: Confused</span>
           </div>
         </div>

         <div className="w-full h-full p-12">
            <TrainingCanvas width={800} height={600} />
         </div>
      </section>
    </div>
  );
}
