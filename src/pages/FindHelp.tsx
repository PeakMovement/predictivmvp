import { useState, useEffect } from 'react';
import { Map as MapIcon, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderSearchFilters } from '@/components/help/ProviderSearchFilters';
import { ProviderCard } from '@/components/help/ProviderCard';
import { ProviderDetailModal } from '@/components/help/ProviderDetailModal';
import { BookingModal } from '@/components/help/BookingModal';
import { CalendlyBookingModal } from '@/components/help/CalendlyBookingModal';
import { BookingConfirmationModal } from '@/components/help/BookingConfirmationModal';
import { useProviders, Provider, SearchFilters } from '@/hooks/useProviders';
import { useBookings } from '@/hooks/useBookings';
import { useIsMobile } from '@/hooks/use-mobile';

export const FindHelp = () => {
  const isMobile = useIsMobile();
  const { providers, isLoading, searchProviders } = useProviders();
  const { lastBooking, clearLastBooking } = useBookings();

  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingProvider, setBookingProvider] = useState<Provider | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    handleSearch();

    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const { q, severity } = JSON.parse(stored);
        if (q) {
          setFilters({ query: q });
          setTimeout(() => handleSearch({ query: q }), 100);
        }
        sessionStorage.removeItem('findHelpQuery');
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  const handleSearch = async (overrideFilters?: SearchFilters) => {
    const searchFilters = overrideFilters || filters;
    await searchProviders(searchFilters);
    setHasSearched(true);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Find Healthcare Providers</h1>
          <p className="text-muted-foreground">
            Search for specialists, book appointments, and read reviews from other patients
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {!isMobile && (
            <aside className="lg:col-span-1">
              <div className="sticky top-6">
                <ProviderSearchFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onSearch={handleSearch}
                />
              </div>
            </aside>
          )}

          <main className={isMobile ? 'col-span-1' : 'lg:col-span-3'}>
            {isMobile && (
              <div className="mb-4">
                <ProviderSearchFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onSearch={handleSearch}
                  isMobile
                />
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div>
                {hasSearched && (
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? 'Searching...' : `${providers.length} providers found`}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className="gap-2"
              >
                {showMap ? (
                  <>
                    <List className="h-4 w-4" />
                    List View
                  </>
                ) : (
                  <>
                    <MapIcon className="h-4 w-4" />
                    Map View
                  </>
                )}
              </Button>
            </div>

            {showMap && (
              <div className="mb-6 rounded-lg border bg-muted/50 h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Map view coming soon</p>
                  <p className="text-sm mt-1">Interactive map with provider locations</p>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : providers.length === 0 && hasSearched ? (
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
                  Try adjusting your search filters to find more providers
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    handleSearch({});
                  }}
                >
                  Clear Filters
                </Button>
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
          </main>
        </div>
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
};
