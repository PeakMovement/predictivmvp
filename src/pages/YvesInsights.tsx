import { YvesChat } from '@/components/YvesChat';

export default function YvesInsights() {
  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-5xl scrollable-content">
        <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Yves Intelligence
            </h1>
          </div>
          <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <p className="text-muted-foreground text-base md:text-lg">
              Your AI health coach powered by comprehensive health intelligence
            </p>
          </div>
        </div>

        <YvesChat />
      </div>
    </div>
  );
}
