import { supabase } from '@/integrations/supabase/client';

export interface YvesQueryRequest {
  query: string;
}

export interface YvesQueryResponse {
  success: boolean;
  response: string;
  error?: string;
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

    const response = await supabase.functions.invoke('yves-chat', {
      body: { query }
    });

    if (response.error) {
      console.error('Yves API error:', response.error);
      return {
        success: false,
        response: '',
        error: response.error.message || 'Failed to get response from Yves'
      };
    }

    return response.data as YvesQueryResponse;
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
      .from('user_context')
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
  profile?: any;
  preferences?: any;
  injuries?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: existing } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_context')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_context')
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
