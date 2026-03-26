import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { type ReactNode } from "react";

export interface ChipOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface OnboardingChipsProps {
  options: ChipOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multi?: boolean;
  maxSelections?: number;
  columns?: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
  /** Value that clears all others when selected (e.g. "none") */
  exclusiveValue?: string;
}

export function OnboardingChips({
  options,
  value,
  onChange,
  multi = false,
  maxSelections,
  columns = 2,
  size = "md",
  exclusiveValue,
}: OnboardingChipsProps) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  const handleClick = (optionValue: string) => {
    if (!multi) {
      onChange(optionValue);
      return;
    }

    // Multi-select logic
    let next: string[];

    if (exclusiveValue && optionValue === exclusiveValue) {
      // Clicking exclusive value clears everything else
      next = selected.includes(optionValue) ? [] : [optionValue];
    } else if (selected.includes(optionValue)) {
      // Deselect
      next = selected.filter((v) => v !== optionValue);
    } else {
      // Select — remove exclusive value if present
      next = selected.filter((v) => v !== exclusiveValue);
      if (maxSelections && next.length >= maxSelections) {
        next = next.slice(1); // drop oldest selection
      }
      next = [...next, optionValue];
    }

    onChange(next);
  };

  const gridClass =
    columns === 1 ? "grid-cols-1" :
    columns === 3 ? "grid-cols-3" :
    "grid-cols-2";

  const padClass =
    size === "sm" ? "px-3 py-2" :
    size === "lg" ? "px-4 py-4" :
    "px-4 py-3";

  return (
    <div className={cn("grid gap-2", gridClass)}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border text-left transition-all duration-200",
              padClass,
              "hover:bg-muted/40 cursor-pointer",
              isSelected
                ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(139,92,246,0.12)]"
                : "border-border/50 bg-card/30"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            {opt.icon && (
              <div className={cn(
                "shrink-0 flex items-center justify-center rounded-lg",
                size === "sm" ? "w-8 h-8" : "w-9 h-9",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {opt.icon}
              </div>
            )}
            <div className="flex-1 min-w-0 pr-4">
              <div className={cn(
                "font-medium leading-tight",
                size === "sm" ? "text-xs" : "text-sm",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {opt.label}
              </div>
              {opt.description && (
                <p className={cn(
                  "mt-0.5 leading-tight",
                  size === "sm" ? "text-[10px]" : "text-xs",
                  "text-muted-foreground/70"
                )}>
                  {opt.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
