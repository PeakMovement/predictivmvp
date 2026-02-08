import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

interface SuggestionContext {
  hasWearableData: boolean;
  hasRecentActivity: boolean;
  hasDocuments: boolean;
  hasHealthProfile: boolean;
}

const generateSuggestions = (context: SuggestionContext): string[] => {
  const suggestions: string[] = [];

  const baseSuggestions = [
    "What should I focus on today?",
    "How am I doing overall?",
    "What patterns do you see in my data?",
  ];

  if (context.hasWearableData) {
    suggestions.push(
      "Am I overtraining based on my recent metrics?",
      "How is my recovery trending?",
      "What does my sleep data tell you about my readiness?",
      "Should I adjust my training intensity today?"
    );
  } else {
    suggestions.push(
      "How can I get started with tracking my health?",
      "What wearables do you recommend?"
    );
  }

  if (context.hasRecentActivity) {
    suggestions.push(
      "How did my last workout compare to previous ones?",
      "Am I improving my performance?",
      "What should I work on in my next training session?"
    );
  }

  if (context.hasDocuments) {
    suggestions.push(
      "What insights can you find in my medical records?",
      "How can I optimize my nutrition based on my documents?"
    );
  }

  if (context.hasHealthProfile) {
    suggestions.push(
      "What health risks should I be aware of?",
      "How can I improve my health outcomes?"
    );
  }

  suggestions.push(...baseSuggestions);

  const uniqueSuggestions = Array.from(new Set(suggestions));

  const shuffled = uniqueSuggestions.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, 4);
};

export function SuggestedQuestions({ onSelectQuestion, disabled }: SuggestedQuestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSuggestions(generateSuggestions({
          hasWearableData: false,
          hasRecentActivity: false,
          hasDocuments: false,
          hasHealthProfile: false,
        }));
        return;
      }

      const [wearableData, activityData, documents, healthProfile] = await Promise.all([
        supabase
          .from('wearable_sessions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('wearable_sessions')
          .select('id')
          .eq('user_id', user.id)
          .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_documents')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_health_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      const context: SuggestionContext = {
        hasWearableData: !!wearableData.data,
        hasRecentActivity: !!activityData.data,
        hasDocuments: !!documents.data,
        hasHealthProfile: !!healthProfile.data,
      };

      setSuggestions(generateSuggestions(context));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions(generateSuggestions({
        hasWearableData: false,
        hasRecentActivity: false,
        hasDocuments: false,
        hasHealthProfile: false,
      }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Suggested Questions</h3>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            className="text-left justify-start h-auto py-2 px-3"
            onClick={() => onSelectQuestion(suggestion)}
            disabled={disabled}
          >
            <span className="text-sm">{suggestion}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}
