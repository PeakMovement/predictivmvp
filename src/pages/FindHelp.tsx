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
  AlertTriangle,
  MapPin,
  DollarSign,
  Clock,
  ShieldCheck
} from "lucide-react";

type HelpStep = "intro" | "assessment" | "provider";

interface FindHelpProps {
  initialStep?: HelpStep;
  symptomType?: string;
  severity?: number;
}

export const FindHelp = ({ initialStep = "intro", symptomType, severity }: FindHelpProps) => {
  const [currentStep, setCurrentStep] = useState<HelpStep>(initialStep);

  const renderIntro = () => (
    <div className="space-y-6">
      {/* Hero Section - Medical Finder Focus */}
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Medical Finder
              </h2>
              <p className="text-muted-foreground">
                Find the right healthcare provider for your needs. We'll match you based on your symptoms, budget, and location.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Verified Providers</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Budget Match</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <MapPin className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Location Based</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="space-y-3">
        <Card 
          className="cursor-pointer hover:bg-primary/5 transition-all border-primary/30 hover:border-primary/50"
          onClick={() => setCurrentStep("provider")}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-lg">Find a Provider</h3>
                <p className="text-sm text-muted-foreground">
                  Search by symptom, budget, and location to find matching providers
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

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
                  Not sure what you need? Get AI-powered guidance first
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
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            How Medical Finder Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Describe your concern</p>
              <p className="text-xs text-muted-foreground">Tell us about your symptoms or health issue</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Set your preferences</p>
              <p className="text-xs text-muted-foreground">Budget, location, and urgency level</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Get matched</p>
              <p className="text-xs text-muted-foreground">See providers ranked by fit for your needs</p>
            </div>
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
              <h3 className="font-medium text-foreground text-sm">Medical Emergency?</h3>
              <p className="text-xs text-muted-foreground">
                Don't use this app – call 911 or go to nearest ER
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
        Back to Medical Finder
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
        Back to Medical Finder
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
            <div>
              <h1 className="text-2xl font-bold text-foreground">Find Help</h1>
              <p className="text-xs text-primary font-medium">Medical Finder</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            {currentStep === "intro" && "Connect with the right healthcare provider for your needs."}
            {currentStep === "assessment" && "Complete a quick assessment to understand what you need."}
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
