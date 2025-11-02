import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles, Calendar, Heart, Moon, Zap, Target, Lightbulb } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getLatestBriefing, generateBriefing, type DailyBriefing, type BriefingCategory } from "@/api/dailyBriefing";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const categories: Array<{ key: BriefingCategory; label: string; icon: any; emoji: string }> = [
  { key: 'recovery', label: 'Recovery', icon: Heart, emoji: '🏃' },
  { key: 'sleep', label: 'Sleep', icon: Moon, emoji: '😴' },
  { key: 'activity', label: 'Activity', icon: Zap, emoji: '💪' },
  { key: 'goals', label: 'Goals', icon: Target, emoji: '🎯' },
  { key: 'tip', label: 'Quick Tip', icon: Lightbulb, emoji: '💡' },
];

export function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [categoryBriefings, setCategoryBriefings] = useState<Record<string, DailyBriefing | null>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingCategories, setGeneratingCategories] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
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

  const handleGenerateBriefing = async (category: BriefingCategory = 'full') => {
    try {
      if (category === 'full') {
        setGenerating(true);
      } else {
        setGeneratingCategories(prev => ({ ...prev, [category]: true }));
      }
      
      const result = await generateBriefing(category);

      if (result.success) {
        toast({
          title: category === 'full' ? "Briefing generated" : `${category} briefing ready`,
          description: category === 'full' ? "Your daily health briefing is ready" : `Your ${category} insights are ready`,
        });
        
        if (category === 'full') {
          await loadBriefing();
        } else {
          const data = await getLatestBriefing(category);
          setCategoryBriefings(prev => ({ ...prev, [category]: data }));
          setOpenCategories(prev => ({ ...prev, [category]: true }));
        }
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
      if (category === 'full') {
        setGenerating(false);
      } else {
        setGeneratingCategories(prev => ({ ...prev, [category]: false }));
      }
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
            onClick={() => handleGenerateBriefing('full')}
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
          <div className="space-y-6">
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

            {/* Category-specific mini briefings */}
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Get focused insights:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map(({ key, label, icon: Icon, emoji }) => (
                  <Collapsible
                    key={key}
                    open={openCategories[key]}
                    onOpenChange={(open) => setOpenCategories(prev => ({ ...prev, [key]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs"
                        onClick={() => {
                          if (!categoryBriefings[key] && !openCategories[key]) {
                            handleGenerateBriefing(key);
                          }
                        }}
                      >
                        {generatingCategories[key] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>{emoji}</span>
                        )}
                        <span className="truncate">{label}</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      {categoryBriefings[key] ? (
                        <Card className="bg-muted/50">
                          <CardContent className="p-3">
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">
                              {categoryBriefings[key]?.content}
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="bg-muted/50">
                          <CardContent className="p-3 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </CardContent>
                        </Card>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Sparkles className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground text-center">
              No daily briefing yet — generate one to see your personalized health summary
            </p>
            <Button onClick={() => handleGenerateBriefing('full')} disabled={generating} className="gap-2">
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
