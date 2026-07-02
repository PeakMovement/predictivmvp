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
        <h2 className="font-display font-light text-4xl text-foreground">
          Welcome to Predictiv.
        </h2>
        <p className="font-sans text-sm text-muted-foreground tracking-wide">
          Your AI-powered health and performance system
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-line mt-8">
        <div className="bg-card p-5 text-center">
          <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40 mb-2">Track</p>
          <p className="font-sans text-xs text-muted-foreground tracking-wide">Connect wearables and monitor biometrics</p>
        </div>
        <div className="bg-card p-5 text-center">
          <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40 mb-2">Analyse</p>
          <p className="font-sans text-xs text-muted-foreground tracking-wide">AI recommendations personalised daily</p>
        </div>
        <div className="bg-card p-5 text-center">
          <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40 mb-2">Protect</p>
          <p className="font-sans text-xs text-muted-foreground tracking-wide">Alerts when health metrics need attention</p>
        </div>
      </div>

      <div className="border border-border p-4 text-left">
        <p className="font-sans text-xs text-muted-foreground tracking-wide leading-relaxed">
          This setup takes about 2 minutes. Your answers shape which formulas and insights Yves activates for you.
        </p>
      </div>
    </div>
  );
};
