import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ReviewFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, reviewText?: string) => Promise<void>;
  existingReview?: {
    rating: number;
    review_text?: string;
  };
  providerName: string;
}

export function ReviewForm({
  open,
  onClose,
  onSubmit,
  existingReview,
  providerName,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxLength = 500;

  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating, reviewText.trim() || undefined);
      onClose();
      setRating(0);
      setReviewText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    if (!existingReview) {
      setRating(0);
      setReviewText('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? 'Edit Your Review' : 'Write a Review'}
          </DialogTitle>
          <DialogDescription>
            Share your experience with {providerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-text">Your Review (Optional)</Label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with this provider..."
              value={reviewText}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  setReviewText(e.target.value);
                }
              }}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/{maxLength} characters
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleClose} variant="outline" className="flex-1" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
