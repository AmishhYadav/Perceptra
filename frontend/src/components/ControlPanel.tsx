import { ModelSelector } from './ModelSelector';
import { TelemetrySliders } from './TelemetrySliders';

export function ControlPanel() {
  return (
    <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-5 space-y-6">
      <ModelSelector />
      <div className="h-px bg-white/5" />
      <TelemetrySliders />
    </div>
  );
}
