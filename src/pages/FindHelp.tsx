import { useState, useEffect } from 'react';
import { MedicalFinderAssistant } from '@/components/medical-finder/MedicalFinderAssistant';

export const FindHelp = () => {
  const [initialSymptoms, setInitialSymptoms] = useState('');

  // Read sessionStorage on mount and clear it
  useEffect(() => {
    const stored = sessionStorage.getItem('findHelpQuery');
    if (stored) {
      try {
        const { q } = JSON.parse(stored);
        if (q) setInitialSymptoms(q);
        sessionStorage.removeItem('findHelpQuery');
        console.log('[FindHelp] Auto-filling symptoms from sessionStorage:', q);
      } catch (e) {
        console.error('[FindHelp] Failed to parse stored query:', e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-6">
      <MedicalFinderAssistant initialSymptomsOverride={initialSymptoms} />
    </div>
  );
};
