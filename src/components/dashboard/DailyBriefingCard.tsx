import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getLatestBriefing, generateBriefing, type DailyBriefing } from "@/api/dailyBriefing";

export function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async () => {
    try {
      setLoading(true);
      const data = await getLatestBriefing();
      setBriefing(data);
    } catch (error) {
      console.error("Error loading briefing:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBriefing = async () => {
    try {
      setGenerating(true);
      
      const result = await generateBriefing();

      if (result.success) {
        toast({
          title: "Briefing generated",
          description: "Your daily health briefing is ready",
        });
        await loadBriefing();
      } else {
        throw new Error(result.error || "Failed to generate briefing");
      }
    } catch (error) {
      console.error("Error generating briefing:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate briefing",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Daily Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>🧠 Yves Daily Briefing</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGenerateBriefing}
            disabled={generating}
            title="Generate new briefing"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {briefing && (
          <CardDescription className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            Generated {formatDistanceToNow(new Date(briefing.created_at), { addSuffix: true })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {briefing ? (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {briefing.content}
              </div>
            </div>
            {briefing.context_used && (
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="text-xs">
                  Based on {briefing.context_used.wearable_sessions?.length || 0} recent sessions
                </Badge>
                {briefing.context_used.memory_bank && briefing.context_used.memory_bank.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {briefing.context_used.memory_bank.length} context items
                  </Badge>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Sparkles className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground text-center">
              No daily briefing yet — generate one to see your personalized health summary
            </p>
            <Button onClick={handleGenerateBriefing} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Briefing
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
