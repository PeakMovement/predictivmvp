// Central backend config — single source of truth for the project URL and
// Edge Functions base. Always resolved from the environment so the app follows
// whichever backend it is connected to.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL;

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/** Build an Edge Function URL: functionUrl("garmin-auth") */
export const functionUrl = (name: string): string => `${FUNCTIONS_URL}/${name}`;
