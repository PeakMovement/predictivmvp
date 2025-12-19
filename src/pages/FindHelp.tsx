import { useState } from "react";
import { TriageForm } from "@/components/triage/TriageForm";
import { ProviderMatchForm } from "@/components/help/ProviderMatchForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ArrowRight, 
  HeartPulse, 
  Stethoscope, 
  Brain,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

type HelpStep = "intro" | "assessment" | "provider";

export const FindHelp = () => {
  const [currentStep, setCurrentStep] = useState<HelpStep>("intro");

  const renderIntro = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <HeartPulse className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Get the Right Care
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We'll guide you through a quick assessment based on your symptoms and health data, 
            then match you with the right healthcare provider.
          </p>
        </CardContent>
      </Card>

      {/* Journey Steps */}
      <div className="space-y-3">
        <Card 
          className="cursor-pointer hover:bg-card/80 transition-colors border-border/50"
          onClick={() => setCurrentStep("assessment")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Smart Assessment</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered triage using your symptoms and health data
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-card/80 transition-colors border-border/50"
          onClick={() => setCurrentStep("provider")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">Find Provider</h3>
                <p className="text-sm text-muted-foreground">
                  Search directly by symptom, budget, and location
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              1
            </div>
            <p className="text-sm text-muted-foreground">
              Tell us about your symptoms or health concern
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              We analyze your wearable data and health history
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              3
            </div>
            <p className="text-sm text-muted-foreground">
              Get matched with the right provider for your needs
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Help */}
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-sm">Emergency?</h3>
              <p className="text-xs text-muted-foreground">
                Call 911 or go to the nearest ER
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" asChild>
              <a href="tel:911">
                Call 911
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAssessment = () => (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setCurrentStep("intro")}
        className="mb-2"
      >
        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
        Back
      </Button>
      
      <TriageForm />
    </div>
  );

  const renderProviderSearch = () => (
    <div className="space-y-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setCurrentStep("intro")}
        className="mb-2"
      >
        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
        Back
      </Button>
      
      <ProviderMatchForm />
    </div>
  );

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
            {currentStep === "intro" && "Get matched with the right healthcare provider based on your symptoms and health data."}
            {currentStep === "assessment" && "Complete a quick assessment to understand your needs."}
            {currentStep === "provider" && "Search for providers that match your criteria."}
          </p>
        </div>

        {/* Content */}
        {currentStep === "intro" && renderIntro()}
        {currentStep === "assessment" && renderAssessment()}
        {currentStep === "provider" && renderProviderSearch()}
      </div>
    </div>
  );
};
