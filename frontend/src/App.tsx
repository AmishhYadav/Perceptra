import { useEffect, useState } from "react";
import { useInferenceStore } from "./store/useInferenceStore";
import { ControlPanel } from "./components/ControlPanel";
import { PredictionCard } from "./components/PredictionCard";
import { Explanations } from "./components/Explanations";
import { VisualPlayground } from "./components/VisualPlayground";
import { Activity, BarChart3 } from "lucide-react";

type Tab = "dashboard" | "visual";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const connectToModel = useInferenceStore((s) => s.connectToModel);

  // Auto-connect to AMNP on mount (for dashboard tab)
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

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-surface/60 rounded-xl p-1 border border-white/5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-accent/15 text-accent"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Activity size={14} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("visual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "visual"
                  ? "bg-accent/15 text-accent"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <BarChart3 size={14} />
              Visual
            </button>
          </div>

          <div className="text-xs text-gray-600 font-mono">v0.2.0</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "dashboard" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Interactive Assessment */}
            <div className="lg:col-span-8">
              <ControlPanel />
            </div>

            {/* Right: Prediction + Explanations stacked */}
            <div className="lg:col-span-4 space-y-5">
              <PredictionCard />
              <Explanations />
            </div>
          </div>
        ) : (
          <VisualPlayground />
        )}
      </main>
    </div>
  );
}

export default App;
