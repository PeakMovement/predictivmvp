import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MedicalFinderAssistant } from '@/components/medical-finder/MedicalFinderAssistant';

export const FindHelp = () => {
  const [searchParams] = useSearchParams();

  // Read query parameters passed from Symptom Checker redirect
  const initialSymptoms = useMemo(() => {
    const q = searchParams.get('q');
    const severity = searchParams.get('severity');
    
    if (q) {
      // Combine symptom text with severity if available
      return severity ? `${q} (Severity: ${severity})` : q;
    }
    return '';
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6">
        <MedicalFinderAssistant initialSymptoms={initialSymptoms} />
      </div>
    </div>
  );
};
