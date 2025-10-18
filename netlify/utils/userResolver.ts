import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the user_id for Fitbit operations
 * Priority:
 * 1. Authenticated user from Supabase Auth
 * 2. User lookup by fitbit_user_id from users table
 * 3. Most recent user_id from fitbit_auto_data
 * 4. Default to "CTBNRR" as fallback
 */
export async function resolveUserId(
  supabase: SupabaseClient,
  fitbitUserId?: string
): Promise<string> {
  try {
    // Try to get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      console.log('✓ Resolved user from Auth:', user.id);
      return user.id;
    }

    // Try to find user by fitbit_user_id
    if (fitbitUserId) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('fitbit_user_id', fitbitUserId)
        .single();
      
      if (data?.id) {
        console.log('✓ Resolved user by Fitbit ID:', data.id);
        return data.id;
      }
    }

    // Fallback to most recent user in fitbit_auto_data
    const { data } = await supabase
      .from('fitbit_auto_data')
      .select('user_id')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.user_id) {
      console.log('✓ Resolved user from recent data:', data.user_id);
      return data.user_id;
    }

    // Final fallback
    console.log('⚠ Using default user_id: CTBNRR');
    return 'CTBNRR';
  } catch (error) {
    console.error('Error resolving user ID:', error);
    return 'CTBNRR';
  }
}
