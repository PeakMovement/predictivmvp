import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-0.5 status-badge transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-coldBlue/20 bg-coldBlue/10 text-coldBlue",
        secondary: "border-border bg-card text-muted-foreground",
        destructive: "border-critical/20 bg-critical/10 text-critical",
        outline: "border-border text-muted-foreground",
        optimal: "border-bioGreen/20 bg-bioGreen/10 text-bioGreen",
        warning: "border-amber/20 bg-amber/10 text-amber",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
