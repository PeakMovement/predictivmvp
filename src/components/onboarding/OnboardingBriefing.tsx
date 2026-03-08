import { useEffect, useState } from "react";
import { Sparkles, Calendar, TrendingUp, MessageCircle, Loader2 } from "lucide-react";
import { generateBriefing } from "@/api/dailyBriefing";

interface OnboardingBriefingProps {
  onNext: () => void;
  onBack: () => void;
}

export const OnboardingBriefing = ({}: OnboardingBriefingProps) => {
  const [generating, setGenerating] = useState(true);
  const [briefingReady, setBriefingReady] = useState(false);

  useEffect(() => {
    generateBriefing("full").then((result) => {
      setBriefingReady(result.success);
    }).finally(() => setGenerating(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">You're All Set!</h2>
        <p className="text-muted-foreground">
          Here's what you can do with Predictiv
        </p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-4 flex gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">Daily Briefings</h3>
            <p className="text-sm text-muted-foreground">
              Get personalized health insights every morning based on your data and goals
            </p>
          </div>
        </div>

        <div className="border rounded-lg p-4 flex gap-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">Health Trends</h3>
            <p className="text-sm text-muted-foreground">
              Track your sleep, activity, and recovery patterns over time
            </p>
          </div>
        </div>

        <div className="border rounded-lg p-4 flex gap-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-purple-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">AI Coach (Yves)</h3>
            <p className="text-sm text-muted-foreground">
              Chat with your AI health coach anytime for personalized advice
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-6 space-y-2">
        <h4 className="font-semibold text-foreground">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Your dashboard will update automatically as data syncs</li>
          <li>• Check back daily for fresh insights and recommendations</li>
          <li>• Use the bottom navigation to explore different sections</li>
          <li>• Tap the settings icon anytime to customize your experience</li>
        </ul>
      </div>

      <div className="text-center">
        {generating ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your first briefing…
          </div>
        ) : briefingReady ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Your first briefing is ready on the dashboard.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your dashboard will generate a briefing once your data syncs.
          </p>
        )}
      </div>
    </div>
  );
};
