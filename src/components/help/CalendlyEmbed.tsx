import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface CalendlyEmbedProps {
  calendlyUrl: string;
  providerName?: string;
}

export function CalendlyEmbed({ calendlyUrl, providerName }: CalendlyEmbedProps) {
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);

  const getAutofillData = () => {
    const storedData = sessionStorage.getItem('findHelpQuery');
    let symptomNotes = '';

    if (storedData) {
      try {
        const { q, severity } = JSON.parse(storedData);
        if (q) {
          symptomNotes = `Symptom: ${q}`;
          if (severity) {
            symptomNotes += `\nSeverity: ${severity}`;
          }
        }
      } catch (e) {
        console.error('[CalendlyEmbed] Failed to parse stored query:', e);
      }
    }

    const autofillParams = new URLSearchParams();

    if (profile?.full_name) {
      autofillParams.append('name', profile.full_name);
    }

    const email = profile?.email || localStorage.getItem('userEmail');
    if (email) {
      autofillParams.append('email', email);
    }

    if (symptomNotes) {
      autofillParams.append('a1', symptomNotes);
    }

    return autofillParams.toString();
  };

  const embedUrl = () => {
    const baseUrl = calendlyUrl.replace(/\/$/, '');
    const autofillParams = getAutofillData();

    if (autofillParams) {
      return `${baseUrl}?${autofillParams}`;
    }
    return baseUrl;
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading booking calendar{providerName ? ` for ${providerName}` : ''}...
            </p>
          </div>
        </div>
      )}

      <iframe
        src={embedUrl()}
        width="100%"
        height="100%"
        frameBorder="0"
        title={`Book appointment${providerName ? ` with ${providerName}` : ''}`}
        onLoad={() => setIsLoading(false)}
        className="w-full h-full"
      />
    </div>
  );
}
