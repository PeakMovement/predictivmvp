import { Button } from '@/components/ui/button';
import { Sparkles, Plus, LayoutGrid } from 'lucide-react';

interface CanvasEmptyStateProps {
  onOpenLibrary: () => void;
}

export function CanvasEmptyState({ onOpenLibrary }: CanvasEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
          <LayoutGrid className="h-12 w-12 text-primary" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-3">
        Welcome to Your Personal Canvas
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-2">
        This is your space to create a personalized overview of what matters most to you.
      </p>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Pick your favorite sections from across the app and arrange them exactly how you like. 
        Everything stays connected to your real data, always up to date.
      </p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Start by adding your first section</span>
      </div>

      <Button size="lg" onClick={onOpenLibrary} className="gap-2">
        <Plus className="h-5 w-5" />
        Add Your First Section
      </Button>
    </div>
  );
}
