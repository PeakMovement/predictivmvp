import { Sparkles } from "lucide-react";

interface OnboardingWelcomeProps {
  onNext: () => void;
  onBack: () => void;
}

export const OnboardingWelcome = ({}: OnboardingWelcomeProps) => {
  return (
    <div className="space-y-8 text-center py-6">
      {/* Mark */}
      <div className="flex justify-center mb-2">
        <div className="w-12 h-12 border border-coldBlue/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-coldBlue/60" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-light text-4xl text-marble3">
          Welcome to Predictiv.
        </h2>
        <p className="font-sans text-sm text-marble1/60 tracking-wide">
          Your AI-powered health and performance system
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line mt-8">
        <div className="bg-surface p-5 text-center">
          <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-coldBlue/40 mb-2">Track</p>
          <p className="font-sans text-xs text-marble1/50 tracking-wide">Connect wearables and monitor biometrics</p>
        </div>
        <div className="bg-surface p-5 text-center">
          <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-coldBlue/40 mb-2">Analyse</p>
          <p className="font-sans text-xs text-marble1/50 tracking-wide">AI recommendations personalised daily</p>
        </div>
        <div className="bg-surface p-5 text-center">
          <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-coldBlue/40 mb-2">Protect</p>
          <p className="font-sans text-xs text-marble1/50 tracking-wide">Alerts when health metrics need attention</p>
        </div>
      </div>

      <div className="border border-line p-4 text-left">
        <p className="font-sans text-xs text-marble1/40 tracking-wide leading-relaxed">
          This setup takes about 2 minutes. Your answers shape which formulas and insights Yves activates for you.
        </p>
      </div>
    </div>
  );
};
