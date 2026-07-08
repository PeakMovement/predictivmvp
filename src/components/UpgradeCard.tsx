import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeCardProps {
  feature: string;
  tier?: string;
  onUpgrade?: () => void;
}

/** Upsell fallback shown in place of a locked premium feature. */
export function UpgradeCard({ feature, tier = "Pro", onUpgrade }: UpgradeCardProps) {
  return (
    <div className="rounded-lg border border-coldBlue/25 bg-coldBlue/5 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-md flex items-center justify-center bg-coldBlue/10 text-coldBlue shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{feature} is a {tier} feature</p>
          <p className="text-xs text-muted-foreground">Upgrade to unlock deeper insight.</p>
        </div>
      </div>
      {/* TODO(billing): wire onUpgrade to Stripe Checkout */}
      <Button size="sm" onClick={onUpgrade} className="shrink-0">Upgrade</Button>
    </div>
  );
}
