import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-surface border border-line animate-pulse", className)} {...props} />;
}

export { Skeleton };
