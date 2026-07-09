import { useState } from "react";
import { CalendarPlus, Check, Loader as Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addEventToGoogleCalendar, isGoogleCalendarConnected, type GoogleCalendarEvent } from "@/lib/googleCalendar";

interface AddToGoogleCalendarButtonProps {
  event: GoogleCalendarEvent;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
  onNeedsConnect?: () => void;
}

/** Adds a given event to the user's Google Calendar (requires the write scope). */
export function AddToGoogleCalendarButton({
  event, size = "sm", variant = "outline", label = "Add to Google Calendar", onNeedsConnect,
}: AddToGoogleCalendarButtonProps) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      if (!(await isGoogleCalendarConnected())) {
        toast({
          title: "Google Calendar not connected",
          description: "Connect it in Settings to add events.",
        });
        onNeedsConnect?.();
        setState("idle");
        return;
      }
      const res = await addEventToGoogleCalendar(event);
      setState("done");
      toast({
        title: "Added to Google Calendar",
        description: event.summary,
        action: res?.event?.htmlLink
          ? (<a href={res.event.htmlLink} target="_blank" rel="noopener noreferrer" className="underline text-sm">View</a>)
          : undefined,
      });
    } catch (err) {
      setState("idle");
      toast({
        title: "Couldn't add event",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button size={size} variant={variant} onClick={handleClick} disabled={state !== "idle"}>
      {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" />
        : state === "done" ? <Check className="h-4 w-4" />
        : <CalendarPlus className="h-4 w-4" />}
      {size !== "icon" && <span className="ml-2">{state === "done" ? "Added" : label}</span>}
    </Button>
  );
}
