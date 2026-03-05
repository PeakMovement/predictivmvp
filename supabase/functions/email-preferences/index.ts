import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPreferences {
  weeklySummary: boolean;
  riskAlerts: boolean;
  aiCoachRecommendations: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use PUT or POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const preferences: EmailPreferences = await req.json();
    
    // Validate preferences structure
    if (
      typeof preferences.weeklySummary !== 'boolean' ||
      typeof preferences.riskAlerts !== 'boolean' ||
      typeof preferences.aiCoachRecommendations !== 'boolean'
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid preferences format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log preferences (mock implementation)
    console.log('📧 Email Preferences Updated:', {
      timestamp: new Date().toISOString(),
      preferences: {
        weeklySummary: preferences.weeklySummary,
        riskAlerts: preferences.riskAlerts,
        aiCoachRecommendations: preferences.aiCoachRecommendations,
      },
      activeNotifications: [
        preferences.weeklySummary && 'Weekly Summary Report',
        preferences.riskAlerts && 'Risk Alerts',
        preferences.aiCoachRecommendations && 'AI Coach Recommendations',
      ].filter(Boolean),
    });

    // TODO: Future integration with email service (Resend/SendGrid)
    // This is where you would:
    // 1. Update user preferences in email service provider
    // 2. Subscribe/unsubscribe from mailing lists
    // 3. Schedule weekly reports if enabled
    // 4. Configure alert triggers if enabled

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email preferences updated successfully',
        preferences,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing email preferences:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
