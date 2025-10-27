import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InsightBox } from './InsightBox';
import { queryYves, getInsightHistory, type InsightHistoryItem } from '@/api/yves';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Sparkles } from 'lucide-react';

export function YvesChat() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightHistoryItem[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setFetchingHistory(true);
      const history = await getInsightHistory();
      setInsights(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast({
        title: 'Empty query',
        description: 'Please enter a question for Yves',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const result = await queryYves(query);

      if (result.success && result.response) {
        toast({
          title: 'Response received',
          description: 'Yves has analyzed your question'
        });

        setQuery('');
        await loadHistory();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to get response from Yves',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error querying Yves:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <CardTitle>Chat with Yves</CardTitle>
          </div>
          <CardDescription>
            Ask me anything about your health, training, nutrition, or recovery. I have access to your complete health profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Ask Yves: How should I adjust my training based on my recent metrics?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              disabled={loading}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={loading || !query.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {fetchingHistory ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : insights.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Conversations
          </h2>
          {insights.map((insight) => (
            <InsightBox
              key={insight.id}
              query={insight.query}
              response={insight.response}
              timestamp={insight.created_at}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              No conversations yet. Ask Yves a question to get started!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
