import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Sparkles, Calendar, AlertTriangle, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { YvesDailyBriefing } from "@/hooks/useYvesIntelligence";
import { cn } from "@/lib/utils";

interface DailyBriefingCardProps {
  briefing: YvesDailyBriefing | null;
  content: string | null;
  createdAt: string | null;
  isLoading: boolean;
  isGenerating: boolean;
  cached: boolean;
  onRefresh: () => void;
}

export function DailyBriefingCard({
  briefing,
  content,
  createdAt,
  isLoading,
  isGenerating,
  cached,
  onRefresh,
}: DailyBriefingCardProps) {
  if (isLoading) {
    return (
      <Card className="animate-fade-in bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Yves Daily Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in bg-glass backdrop-blur-xl border-glass-border shadow-glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>🧠 Yves Daily Briefing</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isGenerating}
            title="Refresh briefing"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {createdAt && (
          <CardDescription className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            {cached ? "Generated" : "Updated"} {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!briefing ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">
              Click refresh to generate your personalized daily briefing
            </p>
            <Button onClick={onRefresh} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Briefing
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm leading-relaxed text-foreground">
                {briefing.summary}
              </p>
            </div>

            {/* Key Changes */}
            {briefing.keyChanges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Key Changes
                </div>
                <div className="space-y-2">
                  {briefing.keyChanges.map((change, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        "bg-card/50 border-border"
                      )}
                    >
                      📊 {change}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Highlights */}
            {briefing.riskHighlights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Attention Needed
                </div>
                <div className="space-y-2">
                  {briefing.riskHighlights.map((risk, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm"
                    >
                      ⚠️ {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
