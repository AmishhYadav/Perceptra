import { Rocket } from "lucide-react";

export function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen pt-24 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center px-6 max-w-7xl mx-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(131,250,165,0.15)_0%,transparent_70%)] -z-10"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Text Content */}
          <div className="lg:col-span-7 z-10">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-surface-container-high mb-8 border border-white/5 shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(102,221,139,0.8)]"></span>
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live Neural Processing Active</span>
            </div>
            
            <h1 className="font-sans text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Decode Human Behavior <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container drop-shadow-sm">
                in Real Time.
              </span>
            </h1>
            
            <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mb-12 leading-relaxed font-body">
              Perceptra leverages low-latency, interpretable machine learning (AMNP, SVM, Neural Nets) to analyze user telemetry and categorize behavioral states—Focused, Distracted, or Confused—instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={onLaunch}
                className="group relative px-8 py-4 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(102,221,139,0.2)] hover:shadow-[0_0_30px_rgba(102,221,139,0.4)]"
              >
                Launch Dashboard
                <Rocket size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
              <button className="px-8 py-4 rounded-xl border border-outline-variant/30 text-primary font-bold text-lg hover:bg-surface-container-low transition-all">
                View Architecture
              </button>
            </div>
          </div>
          
          {/* Visual Asset (Floating Mockup) */}
          <div className="lg:col-span-5 relative hidden lg:flex">
            <div className="relative w-full aspect-square flex items-center justify-center">
              {/* Floating Dashboard Card Mockup */}
              <div className="bg-[rgba(19,27,46,0.8)] backdrop-blur-3xl border-t border-l border-white/10 p-8 rounded-[2rem] w-full max-w-sm rotate-3 -translate-y-8 shadow-2xl relative z-20 hover:rotate-0 transition-transform duration-500">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col">
                    <span className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Global Telemetry</span>
                    <span className="font-sans font-black text-xl text-on-surface">Behavioral Pulse</span>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                     <ActivityPulse />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-bold text-[11px] uppercase tracking-widest text-on-surface-variant">Active Confidence</span>
                    <span className="font-mono font-bold text-primary">99.2%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary-container w-[92%] rounded-full shadow-[0_0_15px_rgba(131,250,165,0.6)]"></div>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-surface-container-low border border-white/5">
                    <span className="font-sans font-bold text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">State</span>
                    <span className="font-sans font-black text-lg text-primary drop-shadow-[0_0_5px_rgba(102,221,139,0.5)]">Focused</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-surface-container-low border border-white/5">
                    <span className="font-sans font-bold text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Latency</span>
                    <span className="font-mono font-black text-lg text-on-surface">0.4ms</span>
                  </div>
                </div>
              </div>
              
              {/* Secondary Overlapping Card */}
              <div className="absolute bg-[rgba(19,27,46,0.8)] backdrop-blur-2xl border border-white/10 p-6 rounded-2xl w-72 -bottom-10 -left-12 -rotate-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-30 hover:rotate-0 transition-transform duration-500 hover:z-40">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary/10 border border-secondary/20">
                    <LayersIcon />
                  </div>
                  <span className="font-sans text-xs uppercase tracking-widest font-black text-on-surface">Neural Net Layer 7</span>
                </div>
                <div className="h-16 w-full bg-surface-container-highest rounded-xl flex items-end px-2 gap-1 pb-2 overflow-hidden border border-white/5">
                  <div className="w-full bg-primary/40 h-[40%] rounded-t"></div>
                  <div className="w-full bg-primary/60 h-[70%] rounded-t"></div>
                  <div className="w-full bg-primary/30 h-[20%] rounded-t"></div>
                  <div className="w-full bg-gradient-to-t from-primary/80 to-primary h-[90%] rounded-t shadow-[0_0_10px_rgba(102,221,139,0.5)]"></div>
                  <div className="w-full bg-primary/50 h-[55%] rounded-t"></div>
                  <div className="w-full bg-primary/70 h-[75%] rounded-t"></div>
                  <div className="w-full bg-primary/90 h-[95%] rounded-t"></div>
                </div>
              </div>

              {/* Abstract Background Decoration */}
              <div className="absolute w-[120%] h-[120%] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-pulse duration-[5000ms]"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-20">
        <div className="text-center mb-20">
          <h2 className="font-sans text-3xl md:text-5xl font-black mb-6 tracking-tight">The Foundation of Inference.</h2>
          <p className="text-on-surface-variant font-body text-lg max-w-2xl mx-auto">Sophisticated architecture designed for the highest precision in human interaction modeling.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface-container-low border border-white/5 p-10 rounded-3xl flex flex-col items-start transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <ZapIcon />
            </div>
            <h3 className="font-sans text-2xl font-black mb-4 tracking-tight">Sub-millisecond Latency</h3>
            <p className="text-on-surface-variant font-body text-base leading-relaxed mb-8">
                Engineered with a C++ core for instantaneous categorization, ensuring that the behavioral analysis never lags behind the user action.
            </p>
            <span className="mt-auto font-sans font-bold text-[10px] uppercase tracking-widest text-primary">Benchmarked @ 0.42ms</span>
          </div>

          <div className="bg-surface-container-low border border-white/5 p-10 rounded-3xl flex flex-col items-start transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <SensorIcon />
            </div>
            <h3 className="font-sans text-2xl font-black mb-4 tracking-tight">Passive Telemetry Engine</h3>
            <p className="text-on-surface-variant font-body text-base leading-relaxed mb-8">
                Non-intrusive monitoring of micro-movements, dwell times, and click paths to build a persistent behavioral profile without user friction.
            </p>
            <span className="mt-auto font-sans font-bold text-[10px] uppercase tracking-widest text-secondary">Privacy-First Architecture</span>
          </div>

          <div className="bg-surface-container-low border border-white/5 p-10 rounded-3xl flex flex-col items-start transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group">
            <div className="w-14 h-14 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <NetworkIcon />
            </div>
            <h3 className="font-sans text-2xl font-black mb-4 tracking-tight">Adaptive Margin Networks</h3>
            <p className="text-on-surface-variant font-body text-base leading-relaxed mb-8">
                Leveraging AMNPs to maintain high interpretability while handling nonlinear user behaviors with state-of-the-art accuracy.
            </p>
            <span className="mt-auto font-sans font-bold text-[10px] uppercase tracking-widest text-tertiary">Interpretable AI model</span>
          </div>
        </div>
      </section>

      {/* Footer Shell */}
      <footer className="bg-surface-container-lowest w-full py-16 px-6 border-t border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2">
              <BrainIcon />
              <span className="text-xl font-black tracking-tighter text-on-surface">Perceptra</span>
            </div>
            <p className="font-sans font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">© 2026 Perceptra AI. The Neural Ethereal.</p>
          </div>
          <div className="flex gap-8">
            <a className="font-sans font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Documentation</a>
            <a className="font-sans font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Model Architecture</a>
            <a className="font-sans font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Mini SVG icons mimicking material symbols exactly
function ActivityPulse() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> }
function LayersIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> }
function ZapIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
function SensorIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><path d="M12 4a8 8 0 0 1 8 8 8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8z"/><path d="M12 8a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4z"/><circle cx="12" cy="12" r="1"/></svg> }
function NetworkIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary"><circle cx="12" cy="20" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M12 6v12"/><path d="M7 11l4.5-4.5"/><path d="M17 11l-4.5-4.5"/><path d="M7 13l4.5 4.5"/><path d="M17 13l-4.5 4.5"/></svg> }
function BrainIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M9.5 2h5"/><path d="M11.5 2v3"/><path d="M4 11a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5v-5z"/><path d="M4 16h16"/></svg> }
