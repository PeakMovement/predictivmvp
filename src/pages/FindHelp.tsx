import { useState } from "react";
import { TriageForm } from "@/components/triage/TriageForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ExternalLink, Stethoscope, ArrowRight } from "lucide-react";

export const FindHelp = () => {
  const [showExternalFinder, setShowExternalFinder] = useState(false);

  if (showExternalFinder) {
    return (
      <div className="flex flex-col w-full h-screen relative bg-background">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExternalFinder(false)}
            className="bg-card/80 backdrop-blur-sm"
          >
            ← Back to Triage
          </Button>
        </div>

        {/* External finder iframe */}
        <iframe
          src="https://preview--predictivmedicalfinder.lovable.app/?step=2"
          style={{
            width: "100%",
            height: "100vh",
            border: "none",
          }}
          loading="lazy"
          allow="clipboard-write; fullscreen"
          title="Predictiv Medical Finder"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Find Help</h1>
          </div>
          <p className="text-muted-foreground">
            Get personalized recommendations for the right healthcare provider based on your health data.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card 
            className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "symptom-checkin" }))}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <Stethoscope className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-foreground">Log Symptoms</span>
              <span className="text-xs text-muted-foreground">First</span>
            </CardContent>
          </Card>
          <Card 
            className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:bg-card/70 transition-colors"
            onClick={() => setShowExternalFinder(true)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <ExternalLink className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-foreground">Browse Providers</span>
              <span className="text-xs text-muted-foreground">Directory</span>
            </CardContent>
          </Card>
        </div>

        {/* Triage Form */}
        <TriageForm />

        {/* Additional Help */}
        <Card className="mt-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground mb-1">Need immediate help?</h3>
                <p className="text-sm text-muted-foreground">
                  If this is an emergency, please call 911 or go to your nearest emergency room.
                </p>
              </div>
              <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
                <a href="tel:911">
                  Call 911
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
