import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MEDICAL_FINDER_BASE_URL = 'https://predictiv-medic-finder.netlify.app';

export const FindHelp = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Build iframe URL with forwarded query params
  const iframeUrl = useMemo(() => {
    const q = searchParams.get('q');
    const severity = searchParams.get('severity');
    
    if (q || severity) {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (severity) params.set('severity', severity);
      return `${MEDICAL_FINDER_BASE_URL}?${params.toString()}`;
    }
    
    return MEDICAL_FINDER_BASE_URL;
  }, [searchParams]);

  // Timeout-based fallback for cross-origin iframe load detection
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const openInNewTab = () => {
    window.open(iframeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 bottom-[72px] sm:bottom-[80px] bg-background overflow-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Medical Finder...</p>
          <Button variant="ghost" size="sm" onClick={openInNewTab} className="gap-2 text-muted-foreground">
            <ExternalLink className="h-4 w-4" />
            Open in new tab instead
          </Button>
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

      {/* Iframe - removed sandbox for cross-origin compatibility */}
      <iframe
        src={iframeUrl}
        title="Medical Finder"
        className="w-full h-full border-0"
        style={{ display: hasError ? 'none' : 'block' }}
        allow="geolocation"
        referrerPolicy="no-referrer-when-downgrade"
        loading="eager"
        onLoad={handleLoad}
      />
    </div>
  );
};