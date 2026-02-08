import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Sparkles } from "lucide-react";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { cn } from "@/lib/utils";

interface WeeklyReflectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  onReflectionSubmitted: () => void;
}

export const WeeklyReflectionModal = ({
  open,
  onOpenChange,
  weekStart,
  onReflectionSubmitted,
}: WeeklyReflectionModalProps) => {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [highlights, setHighlights] = useState("");
  const [challenges, setChallenges] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating for your week",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("weekly_reflections").insert({
        user_id: user.id,
        week_start_date: format(weekStart, "yyyy-MM-dd"),
        week_end_date: format(weekEnd, "yyyy-MM-dd"),
        rating,
        notes: notes || null,
        highlights: highlights || null,
        challenges: challenges || null,
      });

      if (error) throw error;

      toast({
        title: "Reflection Saved",
        description: "Thank you for sharing your weekly reflection!",
      });

      onReflectionSubmitted();
      onOpenChange(false);

      // Reset form
      setRating(0);
      setNotes("");
      setHighlights("");
      setChallenges("");
    } catch (error: any) {
      console.error("Error saving reflection:", error);

      // Check if it's a duplicate error
      if (error.code === '23505') {
        toast({
          title: "Already Reflected",
          description: "You've already submitted a reflection for this week",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save reflection. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">How Was Your Week?</DialogTitle>
          <DialogDescription className="text-center">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Overall Rating</Label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    rating >= star
                      ? "text-yellow-500 scale-110"
                      : "text-muted-foreground hover:text-yellow-500/50"
                  )}
                >
                  <Star
                    className="h-8 w-8"
                    fill={rating >= star ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {rating === 0 && "Select a rating"}
              {rating === 1 && "Very Challenging"}
              {rating === 2 && "Could Be Better"}
              {rating === 3 && "Decent"}
              {rating === 4 && "Good Week"}
              {rating === 5 && "Excellent Week!"}
            </p>
          </div>

          {/* Highlights */}
          <div className="space-y-2">
            <Label htmlFor="highlights" className="text-sm font-medium">
              What went well? (Optional)
            </Label>
            <Textarea
              id="highlights"
              placeholder="Share your wins and positive moments..."
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Challenges */}
          <div className="space-y-2">
            <Label htmlFor="challenges" className="text-sm font-medium">
              What was difficult? (Optional)
            </Label>
            <Textarea
              id="challenges"
              placeholder="Share any struggles or obstacles..."
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* General Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional thoughts? (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any other reflections or observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="bg-secondary/30 p-4 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Your reflections help Yves understand your patterns and provide better recommendations for future weeks.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Skip for Now
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Reflection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
