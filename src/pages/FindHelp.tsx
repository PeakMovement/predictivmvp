import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ExternalLink, Bug, ArrowRight, Sparkles } from 'lucide-react';
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
  const [showPrefillPrompt, setShowPrefillPrompt] = useState(false);

  // Read sessionStorage on mount - DO NOT clear it here
  useEffect(() => {
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStoredQuery(parsed);
        setShowPrefillPrompt(true); // Show the prefill prompt
        console.log('[FindHelp] Found stored query:', parsed);
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  // Build iframe URL with query parameters (without clearing sessionStorage)
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://predictiv-medic-finder.netlify.app';
    
    // Use storedQuery state if available
    if (storedQuery?.q) {
      const params = new URLSearchParams();
      params.set('q', storedQuery.q);
      if (storedQuery.severity) params.set('severity', storedQuery.severity);
      
      const url = `${baseUrl}?${params.toString()}`;
      console.log('[FindHelp] Auto-fill URL from stored query:', url);
      return url;
    }
    
    // Fall back to URL search params
    const q = searchParams.get('q');
    const severity = searchParams.get('severity');
    
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (severity) params.set('severity', severity);
    
    const queryString = params.toString();
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    console.log('[FindHelp] iframe URL:', url);
    return url;
  }, [searchParams, storedQuery]);

  // Handler for using internal finder with auto-fill
  const handleUseInternalFinder = () => {
    setShowPrefillPrompt(false);
    setUseInternalFinder(true);
    // Clear sessionStorage now that we're using the data
    sessionStorage.removeItem('findHelpQuery');
  };

  // Handler for starting fresh (no prefill)
  const handleStartFresh = () => {
    setShowPrefillPrompt(false);
    setStoredQuery(null);
    sessionStorage.removeItem('findHelpQuery');
  };

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

  // If using internal finder, render it directly with symptoms passed as prop
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
          
          <MedicalFinderAssistant initialSymptomsOverride={storedQuery?.q} />
        </div>
      </div>
    );
  }

  // Show prefill prompt when we have symptom data
  if (showPrefillPrompt && storedQuery?.q) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-lg w-full border-primary/30 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Your Symptoms Are Ready</h2>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Your description:</p>
              <p className="text-sm font-medium line-clamp-3">
                {storedQuery.q}
              </p>
              {storedQuery.severity && (
                <p className="text-xs text-muted-foreground mt-2">
                  Severity: {storedQuery.severity}
                </p>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Would you like to auto-fill this into the medical finder to help match you with the right provider?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleUseInternalFinder}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-fill and continue
              </Button>
              <Button 
                variant="outline" 
                onClick={handleStartFresh}
                className="flex-1"
              >
                Start fresh
              </Button>
            </div>
          </CardContent>
        </Card>
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
