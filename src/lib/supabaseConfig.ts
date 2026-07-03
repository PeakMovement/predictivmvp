// Central Supabase config — single source of truth for the project URL and
// Edge Functions base. Prefer VITE_SUPABASE_URL; fall back to the project URL.
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? "https://ixtwbkikyuexskdgfpfq.supabase.co";

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/** Build an Edge Function URL: functionUrl("garmin-auth") */
export const functionUrl = (name: string): string => `${FUNCTIONS_URL}/${name}`;
