import { useState, useEffect } from 'react';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { TreatmentPlanInput } from '@/components/treatment/TreatmentPlanInput';
import { TreatmentPlanCard } from '@/components/treatment/TreatmentPlanCard';
import { TreatmentPlanDetails } from '@/components/treatment/TreatmentPlanDetails';
import { PractitionerCard } from '@/components/treatment/PractitionerCard';
import { generateTreatmentPlans, saveTreatmentPlan } from '@/services/treatmentPlanService';
import { searchPractitioners, MOCK_PRACTITIONERS } from '@/services/practitionerService';
import { TreatmentPlan, HealthcarePractitioner, ServiceCategory } from '@/types/treatmentPlans';
import { supabase } from '@/integrations/supabase/client';

type ViewMode = 'input' | 'plans' | 'plan-details' | 'practitioners';

export const FindHelp = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPractitioners, setIsLoadingPractitioners] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [generatedPlans, setGeneratedPlans] = useState<TreatmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [practitioners, setPractitioners] = useState<HealthcarePractitioner[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const { q } = JSON.parse(stored);
        if (q) {
          handleGeneratePlan(q);
        }
        sessionStorage.removeItem('findHelpQuery');
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  const handleGeneratePlan = async (input: string) => {
    setIsGenerating(true);
    setUserInput(input);

    try {
      const plans = await generateTreatmentPlans(input);
      setGeneratedPlans(plans);
      setViewMode('plans');

      toast({
        title: "Plans Generated",
        description: `Created ${plans.length} personalized treatment plan${plans.length > 1 ? 's' : ''} for you.`,
      });
    } catch (error) {
      console.error('Error generating plans:', error);
      toast({
        title: "Error",
        description: "Failed to generate treatment plans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPlan = (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setViewMode('plan-details');
  };

  const handleConfirmPlan = async () => {
    if (!selectedPlan) return;

    setIsLoadingPractitioners(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await saveTreatmentPlan(selectedPlan, user.id, userInput);
      }

      const serviceCategories = selectedPlan.services.map(s => s.type) as ServiceCategory[];

      let matchedPractitioners: HealthcarePractitioner[];
      try {
        matchedPractitioners = await searchPractitioners({
          serviceCategories,
        });
      } catch (error) {
        console.log('Using mock practitioners as fallback');
        matchedPractitioners = MOCK_PRACTITIONERS.filter(p =>
          p.specialties?.some(s => serviceCategories.includes(s))
        );
      }

      if (matchedPractitioners.length === 0) {
        matchedPractitioners = MOCK_PRACTITIONERS.slice(0, 3);
      }

      setPractitioners(matchedPractitioners);
      setViewMode('practitioners');

      toast({
        title: "Practitioners Found",
        description: `Found ${matchedPractitioners.length} healthcare providers for your plan.`,
      });
    } catch (error) {
      console.error('Error finding practitioners:', error);
      toast({
        title: "Error",
        description: "Failed to find practitioners. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPractitioners(false);
    }
  };

  const handleBackToInput = () => {
    setViewMode('input');
    setGeneratedPlans([]);
    setSelectedPlan(null);
    setPractitioners([]);
  };

  const handleBackToPlans = () => {
    setViewMode('plans');
    setSelectedPlan(null);
  };

  if (isLoadingPractitioners) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Finding the best practitioners for you...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Matching your needs with qualified healthcare providers
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'practitioners' && practitioners.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button
            variant="ghost"
            onClick={handleBackToPlans}
            className="mb-6"
          >
            ← Back to Plans
          </Button>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Recommended Practitioners</h1>
            </div>
            <p className="text-muted-foreground">
              {practitioners.length} healthcare provider{practitioners.length > 1 ? 's' : ''} matched to your treatment plan
            </p>
          </div>

          {selectedPlan && (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan.services.length} services · R {selectedPlan.totalCost.toLocaleString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleBackToPlans}>
                  Change Plan
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {practitioners.map((practitioner) => (
              <PractitionerCard
                key={practitioner.id}
                practitioner={practitioner}
                onBook={() => {
                  toast({
                    title: "Booking",
                    description: `Booking with ${practitioner.fullName}`,
                  });
                }}
                onViewProfile={() => {
                  toast({
                    title: "Profile",
                    description: `Viewing ${practitioner.fullName}'s profile`,
                  });
                }}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button onClick={handleBackToInput} variant="outline">
              Start New Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'plan-details' && selectedPlan) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <TreatmentPlanDetails
            plan={selectedPlan}
            onBack={handleBackToPlans}
            onConfirm={handleConfirmPlan}
          />
        </div>
      </div>
    );
  }

  if (viewMode === 'plans' && generatedPlans.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button
            variant="ghost"
            onClick={handleBackToInput}
            className="mb-6"
          >
            ← New Search
          </Button>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Your Personalized Treatment Plans</h2>
            <p className="text-muted-foreground">
              {generatedPlans.length} plan{generatedPlans.length > 1 ? 's' : ''} tailored to your needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {generatedPlans.map((plan) => (
              <TreatmentPlanCard
                key={plan.id}
                plan={plan}
                onSelect={() => handleSelectPlan(plan)}
                onViewDetails={() => handleSelectPlan(plan)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <TreatmentPlanInput
          onGenerate={handleGeneratePlan}
          isLoading={isGenerating}
        />
      </div>
    </div>
  );
};
