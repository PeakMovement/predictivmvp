/*
  # Create Provider Reviews Table

  1. New Tables
    - `provider_reviews`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `physician_id` (uuid, references physicians)
      - `rating` (integer, 1-5 stars)
      - `review_text` (text, optional comment)
      - `helpful_count` (integer, tracks "helpful" votes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `provider_reviews` table
    - Users can view all reviews
    - Users can only create/update/delete their own reviews
    - Constraint: One review per user per physician
    - Constraint: Rating must be between 1 and 5

  3. Indexes
    - Index on physician_id for fast lookups
    - Index on user_id for user's review history
    - Unique constraint on (user_id, physician_id)
*/

-- Create provider_reviews table
CREATE TABLE IF NOT EXISTS public.provider_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  physician_id UUID NOT NULL REFERENCES public.physicians(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, physician_id)
);

-- Enable RLS
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view reviews
CREATE POLICY "Anyone can view provider reviews"
ON public.provider_reviews
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert their own reviews
CREATE POLICY "Users can create their own reviews"
ON public.provider_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.provider_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.provider_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_reviews_physician_id 
ON public.provider_reviews(physician_id);

CREATE INDEX IF NOT EXISTS idx_provider_reviews_user_id 
ON public.provider_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_provider_reviews_created_at 
ON public.provider_reviews(created_at DESC);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_provider_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER provider_reviews_updated_at
BEFORE UPDATE ON public.provider_reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_reviews_updated_at();

-- Create helpful_votes tracking table for "helpful" button
CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.provider_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS on helpful_votes
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view helpful votes
CREATE POLICY "Users can view helpful votes"
ON public.review_helpful_votes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Users can add their own helpful votes
CREATE POLICY "Users can add helpful votes"
ON public.review_helpful_votes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own helpful votes
CREATE POLICY "Users can remove helpful votes"
ON public.review_helpful_votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index on helpful_votes
CREATE INDEX IF NOT EXISTS idx_helpful_votes_review_id 
ON public.review_helpful_votes(review_id);

CREATE INDEX IF NOT EXISTS idx_helpful_votes_user_id 
ON public.review_helpful_votes(user_id);

-- Create function to update helpful_count when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.provider_reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.provider_reviews 
    SET helpful_count = helpful_count - 1 
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_helpful_count_on_vote
AFTER INSERT OR DELETE ON public.review_helpful_votes
FOR EACH ROW
EXECUTE FUNCTION update_review_helpful_count();

-- Add average_rating column to physicians table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'physicians' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE public.physicians ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create function to update physician rating when reviews change
CREATE OR REPLACE FUNCTION update_physician_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.physicians
  SET 
    rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM public.provider_reviews
      WHERE physician_id = COALESCE(NEW.physician_id, OLD.physician_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.provider_reviews
      WHERE physician_id = COALESCE(NEW.physician_id, OLD.physician_id)
    )
  WHERE id = COALESCE(NEW.physician_id, OLD.physician_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_physician_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.provider_reviews
FOR EACH ROW
EXECUTE FUNCTION update_physician_rating();