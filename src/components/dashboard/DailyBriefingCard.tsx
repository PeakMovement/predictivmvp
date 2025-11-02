import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles, Calendar, Heart, Moon, Zap, Target, Lightbulb, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getLatestBriefing, generateBriefing, type DailyBriefing, type BriefingCategory } from "@/api/dailyBriefing";
import { cn } from "@/lib/utils";

const categories: Array<{ key: BriefingCategory; label: string; icon: React.ComponentType<{ className?: string }>; emoji: string }> = [
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
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Choose a focus area for your daily briefing:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(({ key, label, icon: Icon, emoji }) => (
              <div key={key} className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between gap-2 text-xs"
                  onClick={() => {
                    if (!categoryBriefings[key]) {
                      handleGenerateBriefing(key);
                    }
                    setOpenCategories(prev => ({ ...prev, [key]: !prev[key] }));
                  }}
                >
                  <div className="flex items-center gap-2">
                    {generatingCategories[key] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span>{emoji}</span>
                    )}
                    <span className="truncate">{label}</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    openCategories[key] && "transform rotate-180"
                  )} />
                </Button>
                {openCategories[key] && (
                  <Card className="bg-muted/50 animate-fade-in">
                    <CardContent className="p-3">
                      {categoryBriefings[key] ? (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">
                          {categoryBriefings[key]?.content}
                        </p>
                      ) : generatingCategories[key] ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Click to generate</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
