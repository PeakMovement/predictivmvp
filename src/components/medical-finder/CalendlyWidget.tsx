import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendlyWidgetProps {
  url: string;
  onEventScheduled?: () => void;
  prefill?: {
    name?: string;
    email?: string;
  };
  primaryColor?: string;
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: {
          name?: string;
          email?: string;
        };
        utm?: Record<string, string>;
      }) => void;
    };
  }
}

export function CalendlyWidget({ 
  url, 
  onEventScheduled,
  prefill,
  primaryColor = '0f172a'
}: CalendlyWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerId = 'calendly-inline-widget';

  useEffect(() => {
    // Validate Calendly URL
    if (!url || !url.includes('calendly.com')) {
      setError('Invalid Calendly URL');
      setIsLoading(false);
      return;
    }

    // Load Calendly script
    const loadCalendlyScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if script already loaded
        if (window.Calendly) {
          resolve();
          return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src*="calendly.com"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          return;
        }

        // Load the script
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Calendly widget'));
        document.head.appendChild(script);

        // Also load CSS
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://assets.calendly.com/assets/external/widget.css';
        document.head.appendChild(css);
      });
    };

    const initWidget = async () => {
      try {
        await loadCalendlyScript();

        const container = document.getElementById(containerId);
        if (!container) {
          setError('Widget container not found');
          setIsLoading(false);
          return;
        }

        // Add primary color to URL if provided
        const urlWithColor = url.includes('?') 
          ? `${url}&primary_color=${primaryColor}`
          : `${url}?primary_color=${primaryColor}`;

        if (window.Calendly) {
          window.Calendly.initInlineWidget({
            url: urlWithColor,
            parentElement: container,
            prefill: prefill,
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Calendly widget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking widget');
        setIsLoading(false);
      }
    };

    initWidget();

    // Listen for Calendly events
    const handleCalendlyEvent = (e: MessageEvent) => {
      if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        if (e.data.event === 'calendly.event_scheduled') {
          console.log('Calendly event scheduled:', e.data);
          onEventScheduled?.();
        }
      }
    };

    window.addEventListener('message', handleCalendlyEvent);

    return () => {
      window.removeEventListener('message', handleCalendlyEvent);
    };
  }, [url, prefill, primaryColor, onEventScheduled]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Unable to load booking widget</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open(url, '_blank')}
          className="mt-2"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in Calendly
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading booking widget...</span>
          </div>
        </div>
      )}
      <div 
        id={containerId}
        className="min-h-[500px] w-full"
        style={{ minWidth: '320px' }}
      />
    </div>
  );
}
