import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ExternalLink, Bug, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MedicalFinderAssistant } from '@/components/medical-finder/MedicalFinderAssistant';

export const FindHelp = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [useInternalFinder, setUseInternalFinder] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [storedQuery, setStoredQuery] = useState<{ q?: string; severity?: string } | null>(null);

  // Read sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStoredQuery(parsed);
        console.log('[FindHelp] Found stored query:', parsed);
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  // Build iframe URL with query parameters
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://predictiv-medic-finder.netlify.app';
    
    // Priority 1: Check sessionStorage (from symptom check-in flow)
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const { q, severity } = JSON.parse(stored);
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

  // If using internal finder, render it directly
  if (useInternalFinder) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* Back to iframe option */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseInternalFinder(false)}
            className="mb-4 text-muted-foreground"
          >
            ← Back to embedded finder
          </Button>
          
          <MedicalFinderAssistant />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Debug Panel (dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="bg-background/80 backdrop-blur"
          >
            <Bug className="h-4 w-4 mr-1" />
            Debug
          </Button>
          
          {showDebug && (
            <Card className="mt-2 w-80 max-h-64 overflow-auto">
              <CardContent className="p-3 text-xs font-mono">
                <p className="font-bold mb-2">Stored Query:</p>
                <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto">
                  {storedQuery ? JSON.stringify(storedQuery, null, 2) : 'None'}
                </pre>
                <p className="font-bold mt-2 mb-1">iframe URL:</p>
                <pre className="bg-muted p-2 rounded text-[10px] break-all">
                  {iframeUrl}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Prefill Banner - Show when we have data to prefill */}
      {storedQuery?.q && !isLoading && !hasError && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">
                Your symptom data was sent to the finder. If it didn't auto-fill:
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setUseInternalFinder(true)}
              className="shrink-0"
            >
              Use built-in finder <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
              Unable to load embedded content.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setUseInternalFinder(true)}>
                Use Built-in Finder
              </Button>
              <Button variant="outline" asChild>
                <a href={iframeUrl} target="_blank" rel="noopener noreferrer">
                  Open External <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
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
