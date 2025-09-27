export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg shadow-glow animate-glow-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Your main hub for tracking progress and insights.
        </p>
      </div>
    </div>
  );
};