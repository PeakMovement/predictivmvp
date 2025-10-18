import { BarChart3 } from "lucide-react";
import { useFeedbackSummary } from "@/hooks/useFeedbackSummary";
import { cn } from "@/lib/utils";

export const FeedbackSummaryPanel = () => {
  const { summary, loading, error } = useFeedbackSummary();

  if (loading) return <p className="text-muted-foreground">Loading feedback summary...</p>;
  if (error) return <p className="text-destructive">Error: {error}</p>;
  if (summary.length === 0)
    return (
      <div className="bg-glass border border-glass-border rounded-2xl p-6 shadow-glass">
        <p className="text-sm text-muted-foreground text-center">
          No feedback data yet. Start engaging with your insights to populate this section.
        </p>
      </div>
    );

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-[1.01] transition-all duration-300 ease-out">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
          <BarChart3 size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Feedback Summary</h3>
      </div>
      <div className="space-y-3">
        {summary.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-lg border border-glass-border bg-card/30 hover:bg-glass-highlight transition-all duration-200"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground capitalize">{item.metric}</span>
              <span className="text-xs text-muted-foreground">{item.total_feedback} total responses</span>
            </div>
            <div
              className={cn(
                "text-sm font-bold px-3 py-1.5 rounded-lg",
                item.avg_score >= 4
                  ? "bg-green-500/20 text-green-400"
                  : item.avg_score >= 3
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400",
              )}
            >
              {item.avg_score?.toFixed(1) ?? "–"}/5
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
