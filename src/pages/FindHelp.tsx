import { MedicalFinderAssistant } from '@/components/medical-finder';
import { Users } from 'lucide-react';

interface FindHelpProps {
  initialStep?: 'intro' | 'assessment' | 'provider';
  symptomType?: string;
  severity?: number;
}

export const FindHelp = ({ initialStep, symptomType, severity }: FindHelpProps) => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Medical Finder</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Describe your symptoms and we'll help you find the right healthcare provider
          </p>
        </div>

        {/* Medical Finder Assistant */}
        <MedicalFinderAssistant />
      </div>
    </div>
  );
};
