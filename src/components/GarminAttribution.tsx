import { cn } from "@/lib/utils";

interface GarminAttributionProps {
  className?: string;
  variant?: "inline" | "footer";
}

export const GarminAttribution = ({ className, variant = "footer" }: GarminAttributionProps) => {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <GarminLogo size={16} />
        <span className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">Garmin Connect™</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-2 py-3 mt-4 border-t border-border/40", className)}>
      <GarminLogo size={20} />
      <span className="text-xs text-muted-foreground">
        Data powered by{" "}
        <span className="font-semibold text-foreground">Garmin Connect™</span>
        {" "}· Garmin and Garmin Connect are trademarks of Garmin Ltd.
      </span>
    </div>
  );
};

const GarminLogo = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Garmin logo"
  >
    {/* Garmin G mark — simplified brand representation */}
    <rect width="40" height="40" rx="6" fill="#1B2A47" />
    <path
      d="M20 8C13.373 8 8 13.373 8 20C8 26.627 13.373 32 20 32C26.627 32 32 26.627 32 20V19H20V22H28.5C27.3 25.9 24 28.5 20 28.5C15.306 28.5 11.5 24.694 11.5 20C11.5 15.306 15.306 11.5 20 11.5C22.347 11.5 24.483 12.43 26.06 13.94L28.54 11.46C26.28 9.34 23.29 8 20 8Z"
      fill="#00B140"
    />
  </svg>
);
