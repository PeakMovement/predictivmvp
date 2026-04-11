import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "btn-text inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[11px] transition-all duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] active:opacity-85 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-marble3 text-background hover:opacity-90",
        destructive:
          "bg-critical text-pure hover:opacity-90",
        outline:
          "border border-border bg-transparent text-muted-foreground hover:border-marble1/30 hover:text-foreground",
        secondary:
          "bg-card border border-border text-muted-foreground hover:text-foreground",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-card",
        link: "text-primary underline-offset-4 hover:underline tracking-normal font-normal",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-[10px]",
        lg: "h-12 px-10",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
export default Button
