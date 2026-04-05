import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-card border border-border animate-pulse", className)} {...props} />;
}

export { Skeleton };
