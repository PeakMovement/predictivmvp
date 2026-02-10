import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  sub_specialty?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  rating: number;
  review_count?: number;
  cost_tier?: 'low' | 'medium' | 'high' | 'premium';
  insurance_accepted?: string[];
  availability?: 'immediate' | 'same_day' | 'next_day' | 'within_week' | 'within_month';
  accepting_new_patients?: boolean;
  years_experience?: number;
  education?: string;
  hospital_affiliations?: string[];
  languages?: string[];
  telehealth_available?: boolean;
  verified?: boolean;
  calendly_url?: string;
}

export interface ProviderReview {
  id: string;
  user_id: string;
  physician_id: string;
  rating: number;
  review_text?: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  is_own_review?: boolean;
  has_voted_helpful?: boolean;
}

export interface SearchFilters {
  query?: string;
  specialty?: string;
  distance?: number;
  availability?: string;
  acceptingNewPatients?: boolean;
  telehealthAvailable?: boolean;
  insurance?: string[];
  minRating?: number;
}

interface ProvidersState {
  providers: Provider[];
  isLoading: boolean;
  error: string | null;
  selectedProvider: Provider | null;
}

export function useProviders() {
  const [state, setState] = useState<ProvidersState>({
    providers: [],
    isLoading: false,
    error: null,
    selectedProvider: null,
  });

  const searchProviders = useCallback(async (filters: SearchFilters = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let query = supabase
        .from('physicians')
        .select('*')
        .order('rating', { ascending: false });

      if (filters.query) {
        query = query.or(`name.ilike.%${filters.query}%,specialty.ilike.%${filters.query}%,sub_specialty.ilike.%${filters.query}%`);
      }

      if (filters.specialty) {
        query = query.eq('specialty', filters.specialty);
      }

      if (filters.availability) {
        query = query.eq('availability', filters.availability);
      }

      if (filters.acceptingNewPatients !== undefined) {
        query = query.eq('accepting_new_patients', filters.acceptingNewPatients);
      }

      if (filters.telehealthAvailable !== undefined) {
        query = query.eq('telehealth_available', filters.telehealthAvailable);
      }

      if (filters.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters.insurance && filters.insurance.length > 0) {
        query = query.overlaps('insurance_accepted', filters.insurance);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setState(prev => ({
        ...prev,
        providers: (data || []) as Provider[],
        isLoading: false,
        error: null,
      }));

      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search providers';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error('Search failed', { description: message });
      return [];
    }
  }, []);

  const getProviderById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('physicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setState(prev => ({ ...prev, selectedProvider: data as Provider }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch provider';
      toast.error('Error loading provider', { description: message });
      return null;
    }
  }, []);

  const getProviderReviews = useCallback(async (physicianId: string): Promise<ProviderReview[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data: reviews, error } = await supabase
        .from('provider_reviews')
        .select('*')
        .eq('physician_id', physicianId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!userId) {
        return reviews || [];
      }

      const { data: votedReviews } = await supabase
        .from('review_helpful_votes')
        .select('review_id')
        .eq('user_id', userId);

      const votedReviewIds = new Set(votedReviews?.map(v => v.review_id) || []);

      return (reviews || []).map(review => ({
        ...review,
        is_own_review: review.user_id === userId,
        has_voted_helpful: votedReviewIds.has(review.id),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reviews';
      toast.error('Error loading reviews', { description: message });
      return [];
    }
  }, []);

  const submitReview = useCallback(async (physicianId: string, rating: number, reviewText?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to submit a review');
        return null;
      }

      const { data, error } = await supabase
        .from('provider_reviews')
        .insert({
          physician_id: physicianId,
          user_id: user.id,
          rating,
          review_text: reviewText || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already reviewed this provider');
        } else {
          throw error;
        }
        return null;
      }

      toast.success('Review submitted successfully!');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit review';
      toast.error('Error submitting review', { description: message });
      return null;
    }
  }, []);

  const updateReview = useCallback(async (reviewId: string, rating: number, reviewText?: string) => {
    try {
      const { data, error } = await supabase
        .from('provider_reviews')
        .update({
          rating,
          review_text: reviewText || null,
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Review updated successfully!');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update review';
      toast.error('Error updating review', { description: message });
      return null;
    }
  }, []);

  const deleteReview = useCallback(async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('provider_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review deleted');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete review';
      toast.error('Error deleting review', { description: message });
      return false;
    }
  }, []);

  const toggleHelpfulVote = useCallback(async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to vote');
        return false;
      }

      const { data: existingVote } = await supabase
        .from('review_helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        const { error } = await supabase
          .from('review_helpful_votes')
          .delete()
          .eq('id', existingVote.id);

        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from('review_helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: user.id,
          });

        if (error) throw error;
        return true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to vote';
      toast.error('Error voting', { description: message });
      return false;
    }
  }, []);

  const clearSelectedProvider = useCallback(() => {
    setState(prev => ({ ...prev, selectedProvider: null }));
  }, []);

  return {
    ...state,
    searchProviders,
    getProviderById,
    getProviderReviews,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpfulVote,
    clearSelectedProvider,
  };
}
