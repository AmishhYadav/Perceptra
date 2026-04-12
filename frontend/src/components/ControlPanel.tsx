import { ModelSelector } from "./ModelSelector";
import { BehaviorAssessment } from "./BehaviorAssessment";

export function ControlPanel() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-surface-light/60 backdrop-blur-sm border border-white/5 p-5">
        <ModelSelector />
      </div>
      <BehaviorAssessment />
    </div>
  );
}
