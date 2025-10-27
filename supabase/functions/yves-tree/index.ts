import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user_id from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JWT to get user_id (Supabase edge functions have auth context)
    // Since we enabled verify_jwt=true, Deno automatically validates the JWT
    // and makes the user available in the request context
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id'); // For now, still accept from query

    console.log(`Fetching Yves Tree data for user: ${userId}`);

    // Mock data as fallback
    const mockData = [
      { date: "2025-10-14", value: 0.12, label: "Stable", color: "#22c55e" },
      { date: "2025-10-15", value: 0.35, label: "Elevated strain", color: "#ef4444" },
      { date: "2025-10-16", value: 0.18, label: "Recovered", color: "#22c55e" }
    ];

    // TODO: Replace with live queries to yves_profiles, plan_adherence, health_data
    // For now, return mock data
    console.log(`Returning ${mockData.length} mock data points`);

    return new Response(
      JSON.stringify({ chart: mockData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Yves Tree data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
