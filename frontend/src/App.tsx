import { useEffect, useState } from "react";
import { useInferenceStore } from "./store/useInferenceStore";
import { ControlPanel } from "./components/ControlPanel";
import { PredictionCard } from "./components/PredictionCard";
import { Explanations } from "./components/Explanations";
import { VisualPlayground } from "./components/VisualPlayground";
import { BehaviorAssessment } from "./components/BehaviorAssessment";
import { LandingPage } from "./components/LandingPage";

type Tab = "landing" | "telemetry" | "playground" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("landing");
  const connectAll = useInferenceStore((s) => s.connectAll);
  const connectionStatus = useInferenceStore((s) => s.connectionStatus);

  // Auto-connect to all models on mount
  useEffect(() => {
    connectAll();
    return () => {
      useInferenceStore.getState().disconnect();
    };
  }, [connectAll]);

  if (activeTab === "landing") {
    return <LandingPage onLaunch={() => setActiveTab("telemetry")} />;
  }

  return (
    <>
      {/* ── Sidebar Navigation ── */}
      <aside className="h-screen w-72 fixed left-0 top-0 bg-surface-container-low flex flex-col p-6 gap-2 z-50">
        <div className="mb-8 px-4">
          <h1 className="font-headline text-xl italic text-primary-container">
            Perceptra
          </h1>
          <p className="text-xs text-secondary font-label tracking-tight">
            Behavioral Intelligence
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {/* Telemetry */}
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`flex items-center gap-3 px-4 py-3 transition-all cursor-pointer ${
              activeTab === "telemetry"
                ? "bg-white text-primary-container rounded-lg shadow-sm font-semibold translate-x-1"
                : "text-secondary hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-label">Telemetry</span>
          </button>

          {/* ML Playground */}
          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-3 px-4 py-3 transition-all cursor-pointer ${
              activeTab === "playground"
                ? "bg-white text-primary-container rounded-lg shadow-sm font-semibold translate-x-1"
                : "text-secondary hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined">science</span>
            <span className="font-label">ML Playground</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-3 px-4 py-3 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-white text-primary-container rounded-lg shadow-sm font-semibold translate-x-1"
                : "text-secondary hover:bg-white/50"
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label">Settings</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-variant/10">
          <button
            onClick={() => setActiveTab("landing")}
            className="w-full bg-primary-container text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined">home</span>
            Back to Home
          </button>
          <div className="flex items-center gap-3 mt-6 px-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-sm">person</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">Analyst</span>
              <span className="text-[10px] text-secondary">System User</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="ml-72 flex flex-col min-h-screen">
        {/* Sticky Header */}
        <header className="sticky top-0 w-full glass-panel z-40 flex justify-between items-center px-12 py-8">
          <div className="flex flex-col">
            <h2 className="font-headline text-4xl text-primary leading-none -tracking-tight">
              {activeTab === "telemetry"
                ? "Telemetry Evolution"
                : activeTab === "playground"
                  ? "ML Visual Playground"
                  : "Settings"}
            </h2>
            <p className="text-secondary font-label text-sm mt-2">
              {activeTab === "telemetry"
                ? "Real-time behavioral assessment & model inference"
                : activeTab === "playground"
                  ? "Training visualization & latent space exploration"
                  : "System configuration"}
            </p>
          </div>
          <div className="flex items-center gap-12">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">
                Connection
              </p>
              <p className="font-headline text-xl text-primary flex items-center gap-2 justify-end">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-primary-container animate-pulse"
                      : connectionStatus === "connecting"
                        ? "bg-secondary animate-pulse"
                        : "bg-error"
                  }`}
                />
                <span className="text-sm font-label capitalize">
                  {connectionStatus}
                </span>
              </p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center bg-surface-container-highest rounded-full">
              <span className="material-symbols-outlined text-primary">
                wifi_tethering
              </span>
            </div>
          </div>
        </header>

        {/* Telemetry Tab */}
        <div
          className="px-12 pb-20"
          style={{ display: activeTab === "telemetry" ? "block" : "none" }}
        >
          <div className="flex gap-12">
            {/* Central Intelligence Grid */}
            <div className="flex-1 space-y-12">
              {/* Focus Assessment Game */}
              <section className="relative">
                <BehaviorAssessment />
              </section>

              {/* Model Comparison Grid */}
              <section>
                <PredictionCard />
              </section>

              {/* Feature Importance / Diagnostics */}
              <section>
                <Explanations />
              </section>
            </div>

            {/* Right Sidebar: Model Selector & Telemetry Logs */}
            <aside className="w-96 flex flex-col gap-8">
              <div className="bg-white rounded-lg p-8 shadow-sm border border-outline-variant/10">
                <h3 className="font-headline text-2xl mb-6">Model Detail</h3>
                <ControlPanel />
              </div>
            </aside>
          </div>
        </div>

        {/* Playground Tab */}
        <div
          className="px-12 pb-20"
          style={{ display: activeTab === "playground" ? "block" : "none" }}
        >
          <VisualPlayground />
        </div>

        {/* Settings Tab */}
        <div
          className="px-12 pb-20"
          style={{ display: activeTab === "settings" ? "block" : "none" }}
        >
          <div className="bg-white rounded-lg p-12 shadow-sm border border-outline-variant/10 mt-8">
            <h3 className="font-headline text-3xl italic text-primary mb-4">
              Configuration
            </h3>
            <p className="text-secondary text-sm">
              Settings panel coming soon. WebSocket endpoint, model
              configuration, and telemetry tuning options will appear here.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-12 mt-auto bg-primary-container flex flex-col items-center justify-center gap-6 px-8">
          <h2 className="font-headline italic text-white text-2xl">
            Perceptra
          </h2>
          <div className="flex gap-8">
            <span className="text-outline-variant text-sm font-sans tracking-wide">
              Privacy Policy
            </span>
            <span className="text-outline-variant text-sm font-sans tracking-wide">
              Security
            </span>
            <span className="text-outline-variant text-sm font-sans tracking-wide">
              API Docs
            </span>
          </div>
          <p className="text-outline-variant text-xs font-sans mt-4 opacity-50">
            © 2026 Perceptra. Behavioral Intelligence.
          </p>
        </footer>
      </main>
    </>
  );
}

export default App;
