import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const FindHelp = () => {
  const [iframeUrl, setIframeUrl] = useState('https://predictiv-medic-finder.netlify.app');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const { q, severity } = JSON.parse(stored);
        const params = new URLSearchParams();
        if (q) params.set('symptoms', q);
        if (severity) params.set('severity', severity);
        const paramString = params.toString();
        setIframeUrl(`https://predictiv-medic-finder.netlify.app${paramString ? `?${paramString}` : ''}`);
        sessionStorage.removeItem('findHelpQuery');
        console.log('[FindHelp] Auto-filling from sessionStorage:', { q, severity });
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <iframe 
        src={iframeUrl} 
        className="w-full h-screen border-0"
        onLoad={() => setIsLoading(false)}
        title="Medical Finder"
        allow="geolocation"
      />
    </div>
  );
};
