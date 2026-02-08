import { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Star,
  Video,
  GraduationCap,
  Building2,
  Languages,
  ThumbsUp,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Provider, ProviderReview, useProviders } from '@/hooks/useProviders';
import { ReviewForm } from './ReviewForm';
import { Skeleton } from '@/components/ui/skeleton';

interface ProviderDetailModalProps {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
  onBook: (provider: Provider) => void;
}

export function ProviderDetailModal({
  provider,
  open,
  onClose,
  onBook,
}: ProviderDetailModalProps) {
  const {
    getProviderReviews,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpfulVote,
  } = useProviders();

  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ProviderReview | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (provider && open) {
      loadReviews();
    }
  }, [provider, open]);

  const loadReviews = async () => {
    if (!provider) return;
    setLoadingReviews(true);
    const reviewsData = await getProviderReviews(provider.id);
    setReviews(reviewsData);
    setLoadingReviews(false);
  };

  const handleSubmitReview = async (rating: number, reviewText?: string) => {
    if (!provider) return;
    if (editingReview) {
      await updateReview(editingReview.id, rating, reviewText);
    } else {
      await submitReview(provider.id, rating, reviewText);
    }
    setEditingReview(null);
    await loadReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    const success = await deleteReview(reviewId);
    if (success) {
      setDeletingReviewId(null);
      await loadReviews();
    }
  };

  const handleToggleHelpful = async (reviewId: string) => {
    await toggleHelpfulVote(reviewId);
    await loadReviews();
  };

  const ownReview = reviews.find(r => r.is_own_review);
  const otherReviews = reviews.filter(r => !r.is_own_review);

  const starDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 : 0,
  }));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (!provider) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {getInitials(provider.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-1">{provider.name}</DialogTitle>
                <p className="text-muted-foreground">
                  {provider.specialty}
                  {provider.sub_specialty && ` • ${provider.sub_specialty}`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(provider.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                  {provider.review_count !== undefined && provider.review_count > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({provider.review_count} reviews)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex flex-wrap gap-2">
              {provider.accepting_new_patients && (
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                  Accepting New Patients
                </Badge>
              )}
              {provider.telehealth_available && (
                <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  <Video className="h-3 w-3 mr-1" />
                  Telehealth
                </Badge>
              )}
              {provider.verified && (
                <Badge variant="secondary">✓ Verified</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provider.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${provider.phone}`} className="text-sm hover:underline">
                    {provider.phone}
                  </a>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${provider.email}`} className="text-sm hover:underline truncate">
                    {provider.email}
                  </a>
                </div>
              )}
              {provider.address && (
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">
                    {provider.address}, {provider.city}, {provider.state} {provider.zip_code}
                  </span>
                </div>
              )}
            </div>

            {provider.years_experience && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{provider.years_experience} years of experience</span>
              </div>
            )}

            {provider.education && (
              <div className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Education</p>
                  <p className="text-muted-foreground">{provider.education}</p>
                </div>
              </div>
            )}

            {provider.hospital_affiliations && provider.hospital_affiliations.length > 0 && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Hospital Affiliations</p>
                  <p className="text-muted-foreground">{provider.hospital_affiliations.join(', ')}</p>
                </div>
              </div>
            )}

            {provider.languages && provider.languages.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Languages</p>
                  <p className="text-muted-foreground">{provider.languages.join(', ')}</p>
                </div>
              </div>
            )}

            {provider.insurance_accepted && provider.insurance_accepted.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Insurance Accepted</p>
                <div className="flex flex-wrap gap-2">
                  {provider.insurance_accepted.map((insurance) => (
                    <Badge key={insurance} variant="outline">
                      {insurance}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Patient Reviews</h3>
                {!ownReview && (
                  <Button onClick={() => setShowReviewForm(true)} size="sm">
                    Write a Review
                  </Button>
                )}
              </div>

              {reviews.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold">{provider.rating.toFixed(1)}</p>
                      <div className="flex items-center justify-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(provider.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {starDistribution.map(({ stars, count, percentage }) => (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="text-xs w-8">{stars} ★</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {loadingReviews ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {ownReview && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < ownReview.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">Your Review</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingReview(ownReview);
                                setShowReviewForm(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingReviewId(ownReview.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {ownReview.review_text && (
                          <p className="text-sm mt-2">{ownReview.review_text}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(ownReview.created_at)}
                        </p>
                      </div>
                    )}

                    {otherReviews.length === 0 && !ownReview && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No reviews yet. Be the first to review this provider!
                      </p>
                    )}

                    {otherReviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        {review.review_text && (
                          <p className="text-sm mt-2">{review.review_text}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleHelpful(review.id)}
                            className={review.has_voted_helpful ? 'text-primary' : ''}
                          >
                            <ThumbsUp
                              className={`h-3 w-3 mr-1 ${
                                review.has_voted_helpful ? 'fill-current' : ''
                              }`}
                            />
                            Helpful ({review.helpful_count})
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => onBook(provider)} className="flex-1">
              Book Appointment
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReviewForm
        open={showReviewForm}
        onClose={() => {
          setShowReviewForm(false);
          setEditingReview(null);
        }}
        onSubmit={handleSubmitReview}
        existingReview={
          editingReview
            ? { rating: editingReview.rating, review_text: editingReview.review_text }
            : undefined
        }
        providerName={provider.name}
      />

      <AlertDialog
        open={deletingReviewId !== null}
        onOpenChange={() => setDeletingReviewId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReviewId && handleDeleteReview(deletingReviewId)}
            >
              Delete Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
