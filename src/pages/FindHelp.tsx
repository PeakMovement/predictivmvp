import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const FindHelp = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Build iframe URL with query parameters
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://predictiv-medic-finder.netlify.app';
    
    // Priority 1: Check sessionStorage (from symptom check-in flow)
    const storedQuery = sessionStorage.getItem('findHelpQuery');
    if (storedQuery) {
      try {
        const { q, severity } = JSON.parse(storedQuery);
        sessionStorage.removeItem('findHelpQuery'); // Clear after reading
        
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (severity) params.set('severity', severity);
        
        const url = `${baseUrl}?${params.toString()}`;
        console.log('[FindHelp] Auto-fill URL:', url);
        return url;
      } catch (e) {
        console.error('Failed to parse stored query:', e);
      }
    }
    
    // Priority 2: Fall back to URL search params
    const q = searchParams.get('q');
    const severity = searchParams.get('severity');
    
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (severity) params.set('severity', severity);
    
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    console.log('[FindHelp] iframe URL:', url);
    return url;
  }, [searchParams]);

  // Timeout fallback after 15 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading Medical Finder...</p>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-4 text-center px-4">
            <p className="text-muted-foreground">
              Unable to load embedded content. You can open it directly:
            </p>
            <Button asChild>
              <a href={iframeUrl} target="_blank" rel="noopener noreferrer">
                Open Medical Finder <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={iframeUrl}
        className="w-full min-h-[calc(100vh-80px)] border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="geolocation; microphone; camera"
        title="Medical Finder Assistant"
      />
    </div>
  );
};
