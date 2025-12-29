import { useState, useCallback } from 'react';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MEDICAL_FINDER_URL = 'https://predictiv-medic-finder.netlify.app';

export const FindHelp = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const openInNewTab = () => {
    window.open(MEDICAL_FINDER_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 bottom-[72px] sm:bottom-[80px] bg-background overflow-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Medical Finder...</p>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10 px-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Unable to load Medical Finder</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              The embedded application couldn't be loaded. You can open it directly in a new tab.
            </p>
          </div>
          <Button onClick={openInNewTab} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Medical Finder in new tab
          </Button>
        </div>
      )}

      {/* Iframe - isolated with sandbox for safety */}
      <iframe
        src={MEDICAL_FINDER_URL}
        title="Medical Finder"
        className="w-full h-full border-0"
        style={{ display: hasError ? 'none' : 'block' }}
        allow="geolocation"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        loading="eager"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
