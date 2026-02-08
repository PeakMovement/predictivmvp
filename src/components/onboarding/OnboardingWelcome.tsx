import { Sparkles, Activity, TrendingUp, Shield } from "lucide-react";

interface OnboardingWelcomeProps {
  onNext: () => void;
  onBack: () => void;
}

export const OnboardingWelcome = ({ onNext }: OnboardingWelcomeProps) => {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Welcome to Predictiv
        </h2>
        <p className="text-lg text-muted-foreground">
          Your AI-powered health and performance companion
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto">
            <Activity className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="font-semibold text-foreground">Track Health</h3>
          <p className="text-sm text-muted-foreground">
            Connect your wearables and monitor key health metrics
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto">
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <h3 className="font-semibold text-foreground">Get Insights</h3>
          <p className="text-sm text-muted-foreground">
            Receive personalized AI recommendations daily
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto">
            <Shield className="h-6 w-6 text-purple-500" />
          </div>
          <h3 className="font-semibold text-foreground">Stay Safe</h3>
          <p className="text-sm text-muted-foreground">
            Get alerts when health metrics need attention
          </p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-left">
        <p className="text-sm text-muted-foreground">
          This quick setup will help you get the most out of Predictiv.
          It takes about 2-3 minutes to complete.
        </p>
      </div>
    </div>
  );
};
