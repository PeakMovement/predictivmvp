import { Card } from "@/components/ui/card";

const Onboarding = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-glass backdrop-blur-xl border-glass-border p-8 md:p-12 text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Onboarding
        </h1>
        <p className="text-muted-foreground text-lg">
          Step flow coming next
        </p>
        
        <div className="mt-8 space-y-4 text-left">
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <h3 className="font-semibold text-foreground mb-2">1. Welcome</h3>
            <p className="text-sm text-muted-foreground">Introduction and overview</p>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <h3 className="font-semibold text-foreground mb-2">2. Basic Info</h3>
            <p className="text-sm text-muted-foreground">Personal information collection</p>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <h3 className="font-semibold text-foreground mb-2">3. Injury History</h3>
            <p className="text-sm text-muted-foreground">Medical history and injuries</p>
          </div>
          
          <div className="p-4 rounded-lg bg-background/50 border border-border">
            <h3 className="font-semibold text-foreground mb-2">4. Summary</h3>
            <p className="text-sm text-muted-foreground">Review and confirmation</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
