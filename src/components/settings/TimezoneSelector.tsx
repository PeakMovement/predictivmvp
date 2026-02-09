/**
 * TimezoneSelector Component
 *
 * Allows users to select their preferred timezone for displaying dates and times.
 * Automatically detects and suggests the browser's timezone.
 *
 * @component
 * @example
 * ```tsx
 * <TimezoneSelector
 *   value={userTimezone}
 *   onChange={handleTimezoneChange}
 * />
 * ```
 */
import { useEffect, useState } from "react";
import { Clock, Globe, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getBrowserTimezone,
  commonTimezones,
  getTimezoneOffset,
  formatInTimezone,
} from "@/lib/timezone";

interface TimezoneSelectorProps {
  /** Current timezone value (IANA format) */
  value: string;
  /** Callback when timezone changes */
  onChange: (timezone: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

export const TimezoneSelector = ({ value, onChange, disabled }: TimezoneSelectorProps) => {
  const [browserTimezone] = useState(getBrowserTimezone());
  const [showBrowserSuggestion, setShowBrowserSuggestion] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (value !== browserTimezone && browserTimezone !== 'UTC') {
      setShowBrowserSuggestion(true);
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [value, browserTimezone]);

  const handleUseBrowserTimezone = () => {
    onChange(browserTimezone);
    setShowBrowserSuggestion(false);
  };

  const selectedTimezone = commonTimezones.find(tz => tz.value === value);
  const currentTimeFormatted = formatInTimezone(currentTime, value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="timezone" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Timezone
        </Label>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Choose your timezone to display dates and times correctly. All data is stored in UTC.
        </p>

        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Select timezone">
              {selectedTimezone && (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {selectedTimezone.label} ({selectedTimezone.offset})
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {commonTimezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                <div className="flex items-center justify-between gap-4 w-full">
                  <span>{tz.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {getTimezoneOffset(tz.value)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showBrowserSuggestion && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium">Use browser timezone?</p>
              <p className="text-sm text-muted-foreground mt-1">
                We detected your timezone as {browserTimezone}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBrowserSuggestion(false)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={handleUseBrowserTimezone}
                disabled={disabled}
              >
                <Check className="h-4 w-4 mr-1" />
                Use Browser Timezone
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current time in selected timezone</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedTimezone?.label || value}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-semibold">{currentTimeFormatted}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatInTimezone(currentTime, value, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Note:</strong> Changing your timezone only affects how dates and times are displayed.
          All data is stored in UTC and will remain accurate.
        </p>
      </div>
    </div>
  );
};
