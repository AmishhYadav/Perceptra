import { useEffect } from "react";
import { useInferenceStore } from "./store/useInferenceStore";
import { ControlPanel } from "./components/ControlPanel";
import { PredictionCard } from "./components/PredictionCard";
import { Explanations } from "./components/Explanations";
import { Activity } from "lucide-react";

function App() {
  const connectToModel = useInferenceStore((s) => s.connectToModel);

  // Auto-connect to AMNP on mount
  useEffect(() => {
    connectToModel("AMNP");
    return () => {
      useInferenceStore.getState().disconnect();
    };
  }, [connectToModel]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface-light/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <Activity size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-100 tracking-tight">
                Perceptra
              </h1>
              <p className="text-[11px] text-gray-500 -mt-0.5">
                Behavioral Intelligence Dashboard
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-600 font-mono">v0.1.0</div>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Control Panel */}
          <div className="lg:col-span-3">
            <ControlPanel />
          </div>

          {/* Center: Prediction Card */}
          <div className="lg:col-span-4">
            <PredictionCard />
          </div>

          {/* Right: Explanations */}
          <div className="lg:col-span-5">
            <Explanations />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
