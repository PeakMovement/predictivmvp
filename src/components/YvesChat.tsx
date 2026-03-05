import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConversationThreads } from '@/components/yves/ConversationThreads';
import { SuggestedQuestions } from '@/components/yves/SuggestedQuestions';
import { VoiceInput } from '@/components/yves/VoiceInput';
import { queryYves, getInsightHistory, getLovableAICredits, clearChatHistory, type InsightHistoryItem, type LovableAICredits } from '@/api/yves';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Sparkles, Info, Activity, Trash2 } from 'lucide-react';

export function YvesChat() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightHistoryItem[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [credits, setCredits] = useState<LovableAICredits | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [hasWearableData, setHasWearableData] = useState<boolean | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      setLoadingCredits(true);
      const creditsData = await getLovableAICredits();
      setCredits(creditsData);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

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
        // Update wearable data status
        setHasWearableData(result.has_wearable_data || false);

        toast({
          title: 'Response received',
          description: result.has_wearable_data 
            ? 'Yves analyzed your question with latest health data'
            : 'Yves has analyzed your question'
        });

        setQuery('');
        await loadHistory();
        await loadCredits(); // Refresh credits after query
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

  const handleClearHistory = async () => {
    try {
      setClearingHistory(true);
      const result = await clearChatHistory();

      if (result.success) {
        setInsights([]);
        localStorage.removeItem('chatInsights');
        sessionStorage.removeItem('chatInsights');

        console.log('[Yves AI] Clear Chat executed, state reset.');

        toast({
          title: 'Chat cleared',
          description: 'All conversation history has been deleted'
        });
        setShowClearDialog(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to clear chat history',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[Yves AI] Clear Chat failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setClearingHistory(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setQuery(transcript);
  };

  const handleSuggestedQuestion = (question: string) => {
    setQuery(question);
  };

  const getCreditsVariant = () => {
    if (!credits?.available || !credits.credits?.remaining || !credits.credits?.total) {
      return 'secondary';
    }
    const percentage = (credits.credits.remaining / credits.credits.total) * 100;
    if (percentage > 70) return 'default';
    if (percentage > 30) return 'secondary';
    return 'destructive';
  };

  const renderCreditsBadge = () => {
    if (loadingCredits) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Loading...</span>
        </Badge>
      );
    }

    if (!credits?.available) {
      return (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Badge variant="secondary" className="gap-1 cursor-help">
              <Info className="h-3 w-3" />
              <span className="text-xs">Credits: Unknown</span>
            </Badge>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <p className="text-sm font-medium">Credits Status</p>
              <p className="text-xs text-muted-foreground">
                {credits?.message || 'Unable to fetch credits information. Your queries will still work, but you may encounter rate limits if you exceed your free tier allowance.'}
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    const remaining = credits.credits?.remaining;
    const total = credits.credits?.total;
    const used = credits.credits?.used;

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <Badge variant={getCreditsVariant()} className="gap-1 cursor-help">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs">
              {remaining !== undefined ? `${remaining.toLocaleString()} credits` : 'Credits available'}
            </span>
          </Badge>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <p className="text-sm font-medium">Lovable AI Credits</p>
            {remaining !== undefined && total !== undefined ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Remaining: <span className="font-medium">{remaining.toLocaleString()}</span> / {total.toLocaleString()}
                  </p>
                  {used !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Used: <span className="font-medium">{used.toLocaleString()}</span>
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Each query to Yves consumes credits based on usage. If you run out, you'll need to add more credits in your workspace settings.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                You have free credits available for AI queries. Monitor your usage to avoid rate limits.
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <CardTitle>Chat with Yves</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasWearableData !== null && (
                <Badge 
                  variant={hasWearableData ? "default" : "secondary"} 
                  className="gap-1"
                >
                  <Activity className="h-3 w-3" />
                  <span className="text-xs">
                    {hasWearableData ? "Using latest health data ✓" : "No wearable data available"}
                  </span>
                </Badge>
              )}
              {renderCreditsBadge()}
            </div>
          </div>
          <CardDescription>
            Ask me anything about your health, training, nutrition, or recovery. I have access to your complete health profile and recent wearable data.
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
            <div className="flex justify-between items-center">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                disabled={loading}
              />
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

      {insights.length === 0 && !fetchingHistory && (
        <SuggestedQuestions
          onSelectQuestion={handleSuggestedQuestion}
          disabled={loading}
        />
      )}

      {fetchingHistory ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : insights.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Conversation History
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              disabled={clearingHistory}
              className="gap-2"
            >
              <Trash2 className="h-3 w-3" />
              Clear History
            </Button>
          </div>
          <ConversationThreads insights={insights} />
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              No conversations yet. Try one of the suggested questions above!
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear conversation history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your conversations with Yves. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingHistory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              disabled={clearingHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearingHistory ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear History'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
