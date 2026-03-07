/**
 * Empty State Components
 *
 * Reusable empty state components for various sections of the app.
 * Provides helpful guidance when no data is available.
 *
 * @module EmptyStates
 */
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity,
  Watch,
  Calendar,
  TrendingUp,
  FileText,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface EmptyStateProps {
  /** Icon to display */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  /** Optional secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional helpful information */
  helpText?: string;
  /** Estimated time for data to appear */
  estimatedTime?: string;
}

/**
 * Generic Empty State Component
 *
 * @component
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Watch className="h-12 w-12" />}
 *   title="No wearable connected"
 *   description="Connect your wearable device to start tracking."
 *   action={{ label: "Connect Device", onClick: handleConnect }}
 * />
 * ```
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  helpText,
  estimatedTime,
}: EmptyStateProps) => {
  return (
    <Card className="p-8 md:p-12">
      <div className="flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
        {icon && (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {estimatedTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
            <Clock className="h-4 w-4" />
            <span>Estimated time: {estimatedTime}</span>
          </div>
        )}

        {helpText && (
          <p className="text-sm text-muted-foreground italic">{helpText}</p>
        )}

        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
            {action && (
              <Button
                onClick={action.onClick}
                disabled={action.loading}
                className="w-full sm:w-auto"
              >
                {action.loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onClick}
                className="w-full sm:w-auto"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * Empty Wearable Data State
 *
 * Displays when no wearable device is connected
 */
export const EmptyWearableState = ({
  onConnect,
  isConnecting,
}: {
  onConnect: () => void;
  isConnecting?: boolean;
}) => {
  return (
    <EmptyState
      icon={<Watch className="h-12 w-12" />}
      title="No wearable connected"
      description="Connect your wearable device to start tracking your health metrics."
      action={{
        label: "Connect Device",
        onClick: onConnect,
        loading: isConnecting,
      }}
      helpText="Data will sync automatically once connected"
    />
  );
};

/**
 * Empty Activity Data State
 *
 * Displays when wearable is connected but no activity data yet
 */
export const EmptyActivityState = ({
  onSync,
  isSyncing,
}: {
  onSync?: () => void;
  isSyncing?: boolean;
}) => {
  return (
    <EmptyState
      icon={<Activity className="h-12 w-12" />}
      title="No activity data yet"
      description="Your activity data will appear here once your device syncs. Make sure your device is connected and has recent activity."
      action={
        onSync
          ? {
              label: "Sync Now",
              onClick: onSync,
              loading: isSyncing,
            }
          : undefined
      }
      estimatedTime="Data typically syncs within 5-10 minutes"
      helpText="Activity includes workouts, steps, and active calories"
    />
  );
};

/**
 * Empty Sleep Data State
 *
 * Displays when no sleep data is available
 */
export const EmptySleepState = ({ onSync, isSyncing }: { onSync?: () => void; isSyncing?: boolean }) => {
  return (
    <EmptyState
      icon={<Clock className="h-12 w-12" />}
      title="No sleep data yet"
      description="Sleep data from your wearable will appear here. Make sure you wore your device while sleeping."
      action={
        onSync
          ? {
              label: "Sync Now",
              onClick: onSync,
              loading: isSyncing,
            }
          : undefined
      }
      estimatedTime="Sleep data syncs in the morning after waking"
      helpText="Sleep tracking requires wearing your device throughout the night"
    />
  );
};

/**
 * Empty Training Data State
 *
 * Displays when no training sessions are recorded
 */
export const EmptyTrainingState = ({ onStartSession }: { onStartSession?: () => void }) => {
  return (
    <EmptyState
      icon={<TrendingUp className="h-12 w-12" />}
      title="No training sessions yet"
      description="Your training sessions will appear here once you complete workouts with your connected device."
      action={
        onStartSession
          ? {
              label: "Log Manual Session",
              onClick: onStartSession,
            }
          : undefined
      }
      helpText="Training data includes workouts, intensity, duration, and recovery metrics"
    />
  );
};

/**
 * Empty Documents State
 *
 * Displays when no medical documents are uploaded
 */
export const EmptyDocumentsState = ({ onUpload }: { onUpload: () => void }) => {
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title="No documents uploaded"
      description="Upload medical records, lab results, or health documents for AI-powered analysis and insights."
      action={{
        label: "Upload Document",
        onClick: onUpload,
      }}
      helpText="Supported formats: PDF, PNG, JPG (max 10MB)"
    />
  );
};

/**
 * Empty Calendar State
 *
 * Displays when no calendar is connected
 */
export const EmptyCalendarState = ({ onConnect }: { onConnect: () => void }) => {
  return (
    <EmptyState
      icon={<Calendar className="h-12 w-12" />}
      title="No calendar connected"
      description="Connect your Google Calendar to sync events and optimize your daily schedule around your health metrics."
      action={{
        label: "Connect Calendar",
        onClick: onConnect,
      }}
      helpText="Your calendar data is private and only used for optimization"
    />
  );
};

/**
 * Data Loading State
 *
 * Displays when data is being fetched or synced
 */
export const LoadingDataState = ({ message = "Loading data..." }: { message?: string }) => {
  return (
    <Card className="p-8 md:p-12">
      <div className="flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </Card>
  );
};

/**
 * Error State
 *
 * Displays when there's an error loading data
 */
export const ErrorState = ({
  title = "Failed to load data",
  description = "There was an error loading your data. Please try again.",
  onRetry,
  isRetrying,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) => {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
              loading: isRetrying,
            }
          : undefined
      }
    />
  );
};

/**
 * Metric Value Display with Null Handling
 *
 * Displays a metric value or placeholder when null/undefined
 *
 * @component
 * @example
 * ```tsx
 * <MetricValue value={hrv} unit="ms" placeholder="No data" />
 * ```
 */
interface MetricValueProps {
  /** Metric value (null/undefined for no data) */
  value: number | null | undefined;
  /** Unit to display after value */
  unit?: string;
  /** Placeholder text when no value */
  placeholder?: string;
  /** Number of decimal places */
  decimals?: number;
  /** CSS class name */
  className?: string;
}

export const MetricValue = ({
  value,
  unit,
  placeholder = "—",
  decimals = 0,
  className = "",
}: MetricValueProps) => {
  if (value === null || value === undefined || isNaN(value)) {
    return <span className={`text-muted-foreground ${className}`}>{placeholder}</span>;
  }

  const formattedValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value);

  return (
    <span className={className}>
      {formattedValue}
      {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
    </span>
  );
};
