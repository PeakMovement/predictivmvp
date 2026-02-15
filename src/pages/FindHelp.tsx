import { useState, useEffect } from 'react';
import { Sparkles, Zap, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ProviderCard } from '@/components/help/ProviderCard';
import { ProviderDetailModal } from '@/components/help/ProviderDetailModal';
import { BookingModal } from '@/components/help/BookingModal';
import { CalendlyBookingModal } from '@/components/help/CalendlyBookingModal';
import { BookingConfirmationModal } from '@/components/help/BookingConfirmationModal';
import { useProviders, Provider } from '@/hooks/useProviders';
import { useBookings } from '@/hooks/useBookings';

export const FindHelp = () => {
  const { providers, isLoading, searchProviders } = useProviders();
  const { lastBooking, clearLastBooking } = useBookings();

  const [healthConcern, setHealthConcern] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const { q, severity } = JSON.parse(stored);
        if (q) {
          const concern = severity ? `${q} (Severity: ${severity})` : q;
          setHealthConcern(concern);
          setTimeout(() => handleFindPhysician(concern), 100);
        }
        sessionStorage.removeItem('findHelpQuery');
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  const handleFindPhysician = async (concern?: string) => {
    const searchText = concern || healthConcern;
    if (!searchText.trim()) return;

    await searchProviders({ query: searchText });
    setShowResults(true);
  };

  const handleExampleClick = (example: string) => {
    setHealthConcern(example);
    handleFindPhysician(example);
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
  };

  const handleBookProvider = (provider: Provider) => {
    setBookingProvider(provider);
  };

  const handleBookingSuccess = () => {
    setBookingProvider(null);
  };

  const handleCloseConfirmation = () => {
    clearLastBooking();
  };

  const exampleSearches = [
    'Lower back pain, R1000, Johannesburg',
    'Skin issues - acne, R800, Cape Town',
    'Chest pain, specialist needed, R1200, Durban',
  ];

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => setShowResults(false)}
            className="mb-6"
          >
            ← Back to Search
          </Button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Search Results</h2>
            <p className="text-muted-foreground">
              {isLoading ? 'Searching...' : `${providers.length} providers found`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 rounded-full bg-muted/50 mb-4">
                <svg
                  className="h-12 w-12 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 21a9 9 0 100-18 9 9 0 000 18z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No providers found</h3>
              <p className="text-muted-foreground mb-4">
                Try refining your search or adjusting your criteria
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onSelect={handleProviderSelect}
                  onBook={handleBookProvider}
                />
              ))}
            </div>
          )}
        </div>

        <ProviderDetailModal
          provider={selectedProvider}
          open={selectedProvider !== null}
          onClose={() => setSelectedProvider(null)}
          onBook={(provider) => {
            setSelectedProvider(null);
            handleBookProvider(provider);
          }}
        />

        {bookingProvider?.calendly_url ? (
          <CalendlyBookingModal
            provider={bookingProvider}
            open={bookingProvider !== null}
            onClose={() => setBookingProvider(null)}
          />
        ) : (
          <BookingModal
            provider={bookingProvider}
            open={bookingProvider !== null}
            onClose={() => setBookingProvider(null)}
            onSuccess={handleBookingSuccess}
          />
        )}

        <BookingConfirmationModal
          booking={lastBooking}
          open={lastBooking !== null}
          onClose={handleCloseConfirmation}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
            <Sparkles className="h-8 w-8 text-violet-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">AI Health Assistant</h1>
          <p className="text-lg text-muted-foreground">
            Find the right physician for your health needs
          </p>
        </div>

        <Tabs defaultValue="quick" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="quick" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Search
            </TabsTrigger>
            <TabsTrigger value="detailed" className="gap-2">
              <User className="h-4 w-4" />
              Detailed Assessment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <User className="h-5 w-5 text-violet-500 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      Describe your health concern <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={healthConcern}
                      onChange={(e) => setHealthConcern(e.target.value)}
                      placeholder="Describe your health concern, budget, and preferred location..."
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      * Please try to mention the budget, issue and location if possible
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleFindPhysician()}
                  disabled={!healthConcern.trim() || isLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white py-6 text-lg"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Finding Physicians...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Find My Physician
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-medium">Try these examples</h3>
              </div>
              <div className="space-y-2">
                {exampleSearches.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors flex items-center gap-3 group"
                  >
                    <User className="h-4 w-4 text-violet-500 opacity-60 group-hover:opacity-100" />
                    <span className="text-sm">{example}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <Card className="p-6">
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Detailed Assessment</h3>
                <p className="text-muted-foreground mb-4">
                  Complete a comprehensive health assessment to get personalized provider recommendations
                </p>
                <Button variant="outline">Coming Soon</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
