import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Recommendation {
  id: string;
  recommendation_text: string;
  category: string;
  priority: string;
  created_at: string;
  feedback_score: number | null;
}

export const YvesRecommendationsCard = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('yves_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (recommendationId: string, score: number) => {
    try {
      const { error } = await supabase
        .from('yves_recommendations')
        .update({ 
          feedback_score: score,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', recommendationId);

      if (error) throw error;

      toast({
        title: "Feedback recorded",
        description: "Thank you for helping Yves improve!"
      });

      // Update local state
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, feedback_score: score }
            : rec
        )
      );
    } catch (error) {
      console.error('Error recording feedback:', error);
      toast({
        title: "Error",
        description: "Failed to record feedback",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'training': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'recovery': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'nutrition': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
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

  useEffect(() => {
    fetchRecommendations();

    // Subscribe to new recommendations
    const channel = supabase
      .channel('recommendations_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yves_recommendations'
        },
        () => fetchRecommendations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧠 Yves Recommendations
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
          🧠 Yves Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered insights based on your health documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-muted-foreground">
              Yves will generate your first set of insights once you upload a document or ask a question.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/yves-insights">
                Chat with Yves <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {recommendations.map((rec) => (
              <div 
                key={rec.id}
                className="p-4 rounded-lg border border-border bg-card/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getCategoryColor(rec.category)}>
                      {rec.category.charAt(0).toUpperCase() + rec.category.slice(1)}
                    </Badge>
                    {getPriorityBadge(rec.priority)}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-sm leading-relaxed">
                  {rec.recommendation_text}
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">Was this helpful?</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(rec.id, 1)}
                      disabled={rec.feedback_score !== null}
                      className={rec.feedback_score === 1 ? 'text-green-500' : ''}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback(rec.id, -1)}
                      disabled={rec.feedback_score !== null}
                      className={rec.feedback_score === -1 ? 'text-red-500' : ''}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/yves-insights">
                View All & Chat with Yves <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
