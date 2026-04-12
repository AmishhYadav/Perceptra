import { useEffect, useState } from "react";
import { useInferenceStore } from "./store/useInferenceStore";
import { ControlPanel } from "./components/ControlPanel";
import { PredictionCard } from "./components/PredictionCard";
import { Explanations } from "./components/Explanations";
import { VisualPlayground } from "./components/VisualPlayground";
import { BehaviorAssessment } from "./components/BehaviorAssessment";
import { LandingPage } from "./components/LandingPage";
import { Activity, LayoutDashboard, BrainCircuit, Settings2 } from "lucide-react";

type Tab = "landing" | "dashboard" | "visual" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("landing");
  const connectToModel = useInferenceStore((s) => s.connectToModel);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  // Auto-connect to AMNP on mount
  useEffect(() => {
    connectToModel("AMNP");
    return () => {
      useInferenceStore.getState().disconnect();
    };
  }, [connectToModel]);

  if (activeTab === "landing") {
    return <LandingPage onLaunch={() => setActiveTab("dashboard")} />;
  }

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#0b1326]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-tighter text-[#dae2fd]">Perceptra</div>
          <div className="h-6 w-[1px] bg-[#131b2e]"></div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                connectionStatus === "connected" ? "bg-primary shadow-primary/80" : "bg-error shadow-error/80"
              }`}
            ></span>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${
                connectionStatus === "connected" ? "text-primary" : "text-error"
              }`}
            >
              {connectionStatus}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 items-center text-[11px] font-bold uppercase tracking-widest">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`transition-colors cursor-pointer ${
                activeTab === "dashboard" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Telemetry
            </button>
            <button
              onClick={() => setActiveTab("visual")}
              className={`transition-colors cursor-pointer ${
                activeTab === "visual" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Playground
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`transition-colors cursor-pointer ${
                activeTab === "settings" ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Settings
            </button>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 bg-surface-container-high flex items-center justify-center">
             <Activity size={16} className="text-primary"/>
          </div>
        </div>
      </header>

      {/* NavigationDrawer (Desktop Only) */}
      <aside className="hidden lg:flex h-full w-64 fixed left-0 top-0 bg-[#131b2e] flex-col py-8 px-4 z-40 shadow-[40px_0_40px_-20px_rgba(11,19,38,0.4)] mt-16">
        <div className="text-on-surface font-black mb-10 px-2 tracking-wide uppercase text-sm">ML Console</div>
        <nav className="flex flex-col space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300 cursor-pointer ${
              activeTab === "dashboard"
                ? "text-primary border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent"
                : "text-on-surface-variant opacity-70 hover:text-on-surface hover:bg-surface-container-highest"
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="font-['Inter'] tabular-nums uppercase tracking-widest text-[11px] font-bold">Telemetry</span>
          </button>
          
          <button
            onClick={() => setActiveTab("visual")}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300 cursor-pointer ${
              activeTab === "visual"
                ? "text-primary border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent"
                : "text-on-surface-variant opacity-70 hover:text-on-surface hover:bg-surface-container-highest"
            }`}
          >
            <BrainCircuit size={18} />
            <span className="font-['Inter'] tabular-nums uppercase tracking-widest text-[11px] font-bold">Playground</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300 cursor-pointer ${
              activeTab === "settings"
                ? "text-primary border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent"
                : "text-on-surface-variant opacity-70 hover:text-on-surface hover:bg-surface-container-highest"
            }`}
          >
            <Settings2 size={18} />
            <span className="font-['Inter'] tabular-nums uppercase tracking-widest text-[11px] font-bold">Settings</span>
          </button>
        </nav>
      </aside>

      <main className="lg:pl-64 pt-24 pb-32 px-6 md:px-12 w-full">
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-12">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                 <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-1">Interactive Observation</h1>
                 <p className="text-on-surface-variant text-sm font-medium">Real-time inference stream from behavioral clusters.</p>
               </div>
               <div className="flex items-center gap-4 bg-[rgba(45,52,73,0.6)] backdrop-blur-xl border border-white/5 p-1.5 rounded-xl">
                 <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant px-3">Active Inference Model:</span>
                 {/* ModelSelector wrapped to look like Stitch header dropdown */}
                 <ControlPanel />
               </div>
             </div>
             
             {/* 1. The massive, full-width Assessment Arena */}
             <div className="w-full">
                <BehaviorAssessment />
             </div>

             {/* 2. The Dashboard Metrics row */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-6">
                  <PredictionCard />
               </div>
               <div className="lg:col-span-6">
                  <Explanations />
               </div>
             </div>
          </div>
        )}
        
        {activeTab === "visual" && (
          <VisualPlayground />
        )}

        {activeTab === "settings" && (
           <div className="text-on-surface-variant">Settings coming soon...</div>
        )}
      </main>
    </>
  );
}

export default App;
