import { useState } from "react";
import { SymptomCheckInForm } from "@/components/symptoms/SymptomCheckInForm";
import { SymptomHistory } from "@/components/symptoms/SymptomHistory";
import { Stethoscope } from "lucide-react";

export const SymptomCheckIn = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Symptom Check-In</h1>
          </div>
          <p className="text-muted-foreground">
            Log your symptoms to help Yves and the triage system provide personalized recommendations.
          </p>
        </div>

        {/* Form */}
        <div className="mb-6">
          <SymptomCheckInForm onSuccess={handleSuccess} />
        </div>

        {/* History */}
        <SymptomHistory refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default SymptomCheckIn;
