import { useEffect, useRef } from "react";

export function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const circleRef = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLElement>(null);
  const layersRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const circle = circleRef.current;
    const layer1 = layer1Ref.current;

    const handleScroll = () => {
      if (!circle || !layer1) return;
      const scrollPercent =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);

      // Handle Circle Expansion
      let size = 0;
      if (scrollPercent > 0.1) {
        const expansionProgress = (scrollPercent - 0.1) / 0.4;
        size = Math.min(expansionProgress * 300, 300);

        if (expansionProgress > 0.2) {
          layer1.classList.add("dark-mode-text");
        } else {
          layer1.classList.remove("dark-mode-text");
        }
      } else {
        layer1.classList.remove("dark-mode-text");
      }

      circle.style.width = size + "vmax";
      circle.style.height = size + "vmax";

      // Layer Transitions
      layersRef.current.forEach((layer, index) => {
        if (!layer) return;
        const start = index * 0.25;
        const end = (index + 1) * 0.25;

        if (scrollPercent >= start && scrollPercent < end) {
          layer.classList.add("active");
        } else {
          layer.classList.remove("active");
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    // Trigger initial state
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-background text-on-surface font-sans selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* ── Fixed Nav ── */}
      <nav className="fixed top-0 left-0 w-full z-[100] mix-blend-difference text-white">
        <div className="flex justify-between items-center px-8 py-6 w-full max-w-7xl mx-auto">
          <span className="text-2xl font-headline italic">Perceptra</span>
          <div className="hidden md:flex items-center gap-12 font-label text-xs uppercase tracking-widest">
            <span className="hover:opacity-60 transition-opacity cursor-pointer">
              Intelligence
            </span>
            <span className="hover:opacity-60 transition-opacity cursor-pointer">
              Methodology
            </span>
            <span className="hover:opacity-60 transition-opacity cursor-pointer">
              Architecture
            </span>
          </div>
          <button
            onClick={onLaunch}
            className="bg-white text-black px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform cursor-pointer"
          >
            Launch Console
          </button>
        </div>
      </nav>

      {/* ── Expanding Circle Canvas ── */}
      <div className="fixed top-0 left-0 w-full h-screen pointer-events-none z-5">
        <div
          ref={circleRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary-container rounded-full"
          style={{
            width: 0,
            height: 0,
            transition: "width 0.1s linear, height 0.1s linear",
          }}
        />
      </div>

      {/* ── Scroll Container (600vh for the journey) ── */}
      <div style={{ height: "600vh" }}>
        {/* Layer 1: Intro */}
        <section
          ref={(el) => {
            layer1Ref.current = el;
            layersRef.current[0] = el;
          }}
          className="story-layer active z-10 px-8"
          id="layer-1"
        >
          <div className="max-w-5xl text-center">
            <span className="inline-block px-4 py-1.5 rounded-full border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-8 transition-colors duration-500 landing-badge">
              Intelligence V2.0
            </span>
            <h1 className="font-headline text-6xl md:text-9xl leading-none text-primary tracking-tighter mb-8 transition-colors duration-500 landing-headline">
              The Real-time <br />
              <span className="italic">Behavioral</span> Engine
            </h1>
            <p className="text-secondary text-xl md:text-2xl max-w-2xl mx-auto font-label transition-colors duration-500 landing-subtext">
              Capturing the nuance of human intent through high-frequency
              telemetry.
            </p>
            <div className="mt-12 flex justify-center items-center gap-4 animate-bounce opacity-40 transition-colors duration-500 landing-scroll-indicator">
              <span className="font-label text-xs tracking-widest">
                SCROLL TO UNVEIL
              </span>
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </section>

        {/* Layer 2: Visual Emergence — Telemetry */}
        <section
          ref={(el) => {
            layersRef.current[1] = el;
          }}
          className="story-layer z-20 px-8"
          id="layer-2"
        >
          <div className="flex flex-col lg:flex-row items-center gap-16 max-w-7xl mx-auto">
            <div className="lg:w-1/2">
              <h2 className="font-headline text-6xl text-surface-container-low mb-8 leading-tight">
                Sophisticated <br />
                <span className="italic">Telemetry</span>
              </h2>
              <p className="text-surface-container-low/80 text-xl leading-relaxed mb-8 font-label">
                Lossless event streaming that captures every subtle
                micro-interaction. 8 behavioral features tracked in real-time
                at 10Hz emission rate.
              </p>
              <div className="flex gap-4">
                <div className="h-1 w-12 bg-surface-container-low"></div>
                <div className="h-1 w-4 bg-surface-container-low/20"></div>
                <div className="h-1 w-4 bg-surface-container-low/20"></div>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl bg-primary-container/20 flex items-center justify-center">
                {/* Abstract telemetry visualization */}
                <div className="relative w-full h-full p-8">
                  <svg viewBox="0 0 400 400" className="w-full h-full opacity-60">
                    {/* Flowing sine waves representing data streams */}
                    <path d="M0,200 Q50,150 100,200 T200,200 T300,200 T400,200" fill="none" stroke="#c8eada" strokeWidth="2" />
                    <path d="M0,180 Q60,120 120,180 T240,180 T360,180 T480,180" fill="none" stroke="#adcebe" strokeWidth="1.5" opacity="0.6" />
                    <path d="M0,220 Q40,280 80,220 T160,220 T240,220 T320,220 T400,220" fill="none" stroke="#c8eada" strokeWidth="1" opacity="0.4" />
                    {/* Data points */}
                    <circle cx="100" cy="200" r="4" fill="#163429" />
                    <circle cx="200" cy="180" r="6" fill="#163429" opacity="0.8" />
                    <circle cx="300" cy="210" r="3" fill="#163429" opacity="0.6" />
                    <circle cx="150" cy="190" r="5" fill="#2f4d41" opacity="0.7" />
                    <circle cx="250" cy="205" r="4" fill="#2f4d41" opacity="0.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layer 3: Metrics */}
        <section
          ref={(el) => {
            layersRef.current[2] = el;
          }}
          className="story-layer z-30 px-8 bg-surface-container-low"
          id="layer-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-20 max-w-7xl mx-auto text-primary">
            <div className="text-center group">
              <span className="font-label text-xs uppercase tracking-[0.4em] mb-6 block text-primary/60">
                Features
              </span>
              <div className="font-headline text-8xl lg:text-[10rem] tracking-tighter transition-transform group-hover:scale-110 duration-700">
                8
              </div>
              <p className="font-label text-sm mt-4 italic text-primary/60">
                Behavioral dimensions
              </p>
            </div>
            <div className="text-center group">
              <span className="font-label text-xs uppercase tracking-[0.4em] mb-6 block text-primary/60">
                Frequency
              </span>
              <div className="font-headline text-8xl lg:text-[10rem] tracking-tighter transition-transform group-hover:scale-110 duration-700">
                10<span className="text-3xl italic ml-4 tracking-normal">Hz</span>
              </div>
              <p className="font-label text-sm mt-4 italic text-primary/60">
                Telemetry polling rate
              </p>
            </div>
            <div className="text-center group">
              <span className="font-label text-xs uppercase tracking-[0.4em] mb-6 block text-primary/60">
                Models
              </span>
              <div className="font-headline text-8xl lg:text-[10rem] tracking-tighter transition-transform group-hover:scale-110 duration-700">
                4
              </div>
              <p className="font-label text-sm mt-4 italic text-primary/60">
                Active architectures
              </p>
            </div>
          </div>
        </section>

        {/* Layer 4: Final Call */}
        <section
          ref={(el) => {
            layersRef.current[3] = el;
          }}
          className="story-layer z-40 px-8"
          id="layer-4"
        >
          <div className="max-w-4xl text-center">
            <h2 className="font-headline text-7xl md:text-9xl mb-12 tracking-tighter text-surface-container-low">
              Ready to see the{" "}
              <span className="italic">invisible?</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button
                onClick={onLaunch}
                className="bg-primary-fixed text-on-primary-fixed px-12 py-6 rounded-full text-xl font-semibold hover:scale-105 transition-all shadow-xl cursor-pointer"
              >
                Launch Engine
              </button>
              <span className="text-surface-container-low/60 font-label tracking-widest uppercase text-sm border-b border-surface-container-low/30 pb-2 cursor-pointer hover:border-surface-container-low transition-colors">
                The Technical Journal
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 w-full z-[100] p-8 text-surface-container-low/40 font-label text-[10px] uppercase tracking-[0.5em] flex justify-between pointer-events-none">
        <div>© 2026 Perceptra</div>
        <div>Precision in Monitoring</div>
      </footer>

      {/* ── Inline styles for the scroll-driven animation states ── */}
      <style>{`
        .story-layer {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease, transform 0.8s ease, color 0.5s ease;
          pointer-events: none;
        }
        .story-layer.active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        /* Dark mode text transition for layer 1 as circle expands */
        #layer-1.dark-mode-text .landing-headline {
          color: #fbf9f4;
        }
        #layer-1.dark-mode-text .landing-subtext {
          color: rgba(251, 249, 244, 0.7);
        }
        #layer-1.dark-mode-text .landing-badge {
          border-color: rgba(251, 249, 244, 0.2);
          color: #fbf9f4;
        }
        #layer-1.dark-mode-text .landing-scroll-indicator {
          color: #fbf9f4;
        }
      `}</style>
    </div>
  );
}
