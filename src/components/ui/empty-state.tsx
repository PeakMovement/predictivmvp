import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  estimatedTime?: string;
  tips?: string[];
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  estimatedTime,
  tips,
  className,
}: EmptyStateProps) => {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center text-center p-8 md:p-12">
        {Icon && (
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Icon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>

        {(actionLabel || secondaryActionLabel) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {actionLabel && onAction && (
              <Button onClick={onAction} size="lg">
                {actionLabel}
              </Button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <Button onClick={onSecondaryAction} variant="outline" size="lg">
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        )}

        {estimatedTime && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4 w-full max-w-md">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {estimatedTime}
            </p>
          </div>
        )}

        {tips && tips.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 w-full max-w-md text-left">
            <h4 className="font-medium text-foreground text-sm mb-2">Tips:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
