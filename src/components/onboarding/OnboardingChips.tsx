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

    let next: string[];
    if (exclusiveValue && optionValue === exclusiveValue) {
      next = selected.includes(optionValue) ? [] : [optionValue];
    } else if (selected.includes(optionValue)) {
      next = selected.filter((v) => v !== optionValue);
    } else {
      next = selected.filter((v) => v !== exclusiveValue);
      if (maxSelections && next.length >= maxSelections) {
        next = next.slice(1);
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
    size === "sm" ? "px-3 py-2.5" :
    size === "lg" ? "px-4 py-4" :
    "px-4 py-3";

  return (
    <div className={cn("grid gap-px bg-line", gridClass)}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt.value)}
            className={cn(
              "relative flex items-start gap-3 text-left transition-all duration-150",
              padClass,
              "cursor-pointer",
              isSelected
                ? "bg-card border-l-2 border-l-coldBlue"
                : "bg-background hover:bg-card border-l-2 border-l-transparent"
            )}
          >
            {isSelected && (
              <div className="absolute top-2.5 right-3">
                <Check className="h-3 w-3 text-coldBlue" />
              </div>
            )}
            {opt.icon && (
              <div className={cn(
                "shrink-0 flex items-center justify-center",
                size === "sm" ? "w-7 h-7" : "w-8 h-8",
                isSelected ? "text-coldBlue" : "text-muted-foreground/60"
              )}>
                {opt.icon}
              </div>
            )}
            <div className="flex-1 min-w-0 pr-5">
              <div className={cn(
                "font-sans font-medium tracking-wide leading-tight",
                size === "sm" ? "text-xs" : "text-sm",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {opt.label}
              </div>
              {opt.description && (
                <p className={cn(
                  "mt-0.5 leading-tight tracking-wide",
                  size === "sm" ? "text-[10px]" : "text-xs",
                  isSelected ? "text-muted-foreground" : "text-muted-foreground/50"
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
