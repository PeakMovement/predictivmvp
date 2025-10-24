import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl w-full">
        <h1 className="mb-4 text-4xl font-bold">Predictiv Health Platform</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Welcome to Predictiv - Your AI-Powered Health Analytics Platform
        </p>

        <Card className="p-6">
          <div className="text-left space-y-4">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="space-y-2">
              <p className="text-sm">✅ Analytics Engine: Active</p>
              <p className="text-sm">✅ Trend Calculation: Ready</p>
              <p className="text-sm">✅ Baseline Detection: Operational</p>
              <p className="text-sm">✅ Yves AI Coach: Online</p>
              <p className="text-sm text-muted-foreground">⚠️ Fitbit OAuth: Removed (awaiting new auth system)</p>
            </div>
          </div>
        </Card>

        <p className="mt-4 text-sm text-muted-foreground">
          Navigate using the bottom menu to access your dashboard and health metrics
        </p>
      </div>
    </div>
  );
};

export default Index;
