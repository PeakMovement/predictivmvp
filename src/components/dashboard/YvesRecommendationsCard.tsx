import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Lightbulb, ArrowRight } from "lucide-react";
import { YvesRecommendation } from "@/hooks/useYvesIntelligence";
import { cn } from "@/lib/utils";

interface YvesRecommendationsCardProps {
  recommendations: YvesRecommendation[];
  isLoading: boolean;
}

export function YvesRecommendationsCard({ recommendations, isLoading }: YvesRecommendationsCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'training': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'recovery': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'nutrition': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'sleep': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'activity': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'training': return '💪';
      case 'recovery': return '🏃';
      case 'nutrition': return '🥗';
      case 'medical': return '🏥';
      case 'sleep': return '😴';
      case 'activity': return '⚡';
      default: return '💡';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Low</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Yves Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Loading recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          🎯 Yves Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered actions based on your health data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-muted-foreground">
              Yves will generate personalized recommendations once your daily briefing is ready.
            </p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "yves-insights" }))}
            >
              Chat with Yves <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {recommendations.map((rec, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-lg border border-border bg-card/50 space-y-3",
                  rec.priority === 'high' && "border-l-4 border-l-destructive"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                    <Badge className={getCategoryColor(rec.category)}>
                      {rec.category.charAt(0).toUpperCase() + rec.category.slice(1)}
                    </Badge>
                    {getPriorityBadge(rec.priority)}
                  </div>
                </div>
                
                <p className="text-sm leading-relaxed font-medium">
                  {rec.text}
                </p>

                {rec.reasoning && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {rec.reasoning}
                  </p>
                )}
              </div>
            ))}

            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "yves-insights" }))}
            >
              View All & Chat with Yves <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
