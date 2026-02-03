import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useYvesIntelligence } from '@/hooks/useYvesIntelligence';
import { useTodaysDecision } from '@/hooks/useTodaysDecision';
import { GreetingHeader } from '@/components/landing/GreetingHeader';
import { PrimaryInsightCard } from '@/components/landing/PrimaryInsightCard';
import { CondensedSessionCard } from '@/components/landing/CondensedSessionCard';

const Index = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const { dailyBriefing, isLoading: isLoadingIntelligence, error: intelligenceError } = useYvesIntelligence('balance');
  const { decision, isLoading: isLoadingDecision } = useTodaysDecision();

  // Fetch user's first name from profiles table
  useEffect(() => {
    async function fetchUserName() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingProfile(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.full_name) {
          // Extract first name
          const firstName = profile.full_name.split(' ')[0];
          setUserName(firstName);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchUserName();
  }, []);

  const isLoading = isLoadingProfile || isLoadingIntelligence;

  // Parse error for user-friendly display
  const getErrorMessage = (): string | null => {
    if (!intelligenceError) return null;
    
    if (intelligenceError.includes('credits') || intelligenceError.includes('402')) {
      return 'AI credits exhausted. Please add credits to continue receiving personalized insights.';
    }
    
    return 'Unable to generate insights right now. Please try again later.';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 pb-24 space-y-6">
        {/* Greeting Section */}
        <GreetingHeader 
          userName={userName} 
          isLoading={isLoadingProfile} 
        />

        {/* Primary Insight Card */}
        <PrimaryInsightCard
          focus={dailyBriefing?.todaysFocus}
          summary={dailyBriefing?.summary}
          isLoading={isLoadingIntelligence}
          error={getErrorMessage()}
        />

        {/* Recommended Session (condensed) */}
        <CondensedSessionCard 
          decision={decision} 
          isLoading={isLoadingDecision} 
        />

        {/* Navigation CTA */}
        <div className="pt-4">
          <Button asChild variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
            <Link to="/dashboard">
              See full briefing
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
