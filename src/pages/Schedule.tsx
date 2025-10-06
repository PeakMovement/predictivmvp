import { FloatingNextDayButton } from "@/components/FloatingNextDayButton";

export const Schedule = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8">
        <div className="text-center mb-12 space-y-4">
          <div className="animate-fade-in-slow">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Schedule</h1>
          </div>
        </div>
      </div>
      <FloatingNextDayButton />
    </div>
  );
};