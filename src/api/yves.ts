import { supabase } from '@/integrations/supabase/client';

export interface YvesQueryRequest {
  query: string;
}

export interface YvesQueryResponse {
  success: boolean;
  response: string;
  error?: string;
  has_wearable_data?: boolean;
}

export interface InsightHistoryItem {
  id: string;
  user_id: string;
  query: string;
  response: string;
  created_at: string;
}

export async function queryYves(query: string): Promise<YvesQueryResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        response: '',
        error: 'You must be logged in to chat with Yves'
      };
    }

    const { data, error } = await supabase.functions.invoke('yves-chat', {
      body: { query }
    });

    if (error) {
      console.error('Yves API error:', error);
      return {
        success: false,
        response: '',
        error: error.message || 'Failed to get response from Yves'
      };
    }

    return data as YvesQueryResponse;
  } catch (error) {
    console.error('Error querying Yves:', error);
    return {
      success: false,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getInsightHistory(): Promise<InsightHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('insight_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching insight history:', error);
      return [];
    }

    return data as InsightHistoryItem[];
  } catch (error) {
    console.error('Error fetching insight history:', error);
    return [];
  }
}

export async function getUserContext() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_context_enhanced')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user context:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

export async function updateUserContext(updates: {
  nutrition_profile?: Record<string, unknown>;
  medical_profile?: Record<string, unknown>;
  training_profile?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: existing } = await supabase
      .from('user_context_enhanced')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_context_enhanced')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_context_enhanced')
        .insert({
          user_id: user.id,
          ...updates
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating user context:', error);
    throw error;
  }
}

export async function getYvesRecommendations(limit: number = 10): Promise<Record<string, unknown>[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('yves_recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function updateRecommendationFeedback(
  recommendationId: string,
  feedbackScore: number
): Promise<void> {
  const { error } = await supabase
    .from('yves_recommendations')
    .update({ 
      feedback_score: feedbackScore,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', recommendationId);

  if (error) throw error;
}

export interface LovableAICredits {
  available: boolean;
  message?: string;
  credits?: {
    remaining?: number;
    total?: number;
    used?: number;
    reset_date?: string;
  };
}

export async function getLovableAICredits(): Promise<LovableAICredits> {
  try {
    const { data, error } = await supabase.functions.invoke('lovable-ai-credits');

    if (error) {
      console.error('Error fetching Lovable AI credits:', error);
      return { available: false, message: 'Unable to fetch credits' };
    }

    return data as LovableAICredits;
  } catch (error) {
    console.error('Error fetching Lovable AI credits:', error);
    return { available: false, message: 'Unable to fetch credits' };
  }
}

/**
 * Clear all chat history for the current user
 */
export async function clearChatHistory(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to clear chat history'
      };
    }

    const { error } = await supabase
      .from('insight_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing chat history:', error);
      return {
        success: false,
        error: error.message || 'Failed to clear chat history'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
