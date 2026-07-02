/**
 * PredictivLoader — the ONLY loading indicator in the app.
 * A 1px cold-blue hairline that sweeps left to right continuously.
 *
 * Usage:
 *   <PredictivLoader />              — inline, within a container
 *   <PredictivLoader fixed />        — fixed to top of viewport
 *   <PredictivLoader width="w-32" /> — custom width
 */

import { cn } from "@/lib/utils";

interface PredictivLoaderProps {
  fixed?: boolean;
  width?: string;
  className?: string;
}

export function PredictivLoader({ fixed = false, width = "w-full", className }: PredictivLoaderProps) {
  if (fixed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] h-px overflow-hidden bg-transparent">
        <div className="h-px w-full bg-coldBlue animate-hairline-sweep" />
      </div>
    );
  }

  return (
    <div className={cn("h-px overflow-hidden bg-transparent", width, className)}>
      <div className="h-px w-full bg-coldBlue animate-hairline-sweep" />
    </div>
  );
}

/**
 * Replaces any full-screen or section-level loading state.
 * Centers the hairline sweep with optional label above it.
 */
export function PredictivLoadingState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      {label && (
        <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground/60">{label}</p>
      )}
      <PredictivLoader width="w-24" />
    </div>
  );
}
