-- Add DELETE policy for insight_history so users can clear their own chat history
CREATE POLICY "Users can delete their own insight history" 
ON public.insight_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add DELETE policy for yves_memory_bank so users can clear their own memories  
CREATE POLICY "Users can delete their own yves memory"
ON public.yves_memory_bank
FOR DELETE
USING (auth.uid() = user_id);