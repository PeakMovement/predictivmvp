import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId } = await req.json();

    console.log(`Building health profile for user ${userId}`);

    // Fetch all document insights for this user
    const { data: insights, error: insightsError } = await supabase
      .from('document_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (insightsError) {
      throw insightsError;
    }

    if (!insights || insights.length === 0) {
      console.log('No insights found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No insights to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Separate insights by type
    const nutritionInsights = insights.filter(i => i.insight_type === 'nutrition');
    const medicalInsights = insights.filter(i => i.insight_type === 'medical');
    const trainingInsights = insights.filter(i => i.insight_type === 'training');

    // Merge data by type (take most recent for each field)
    const nutritionData = nutritionInsights.length > 0 ? nutritionInsights[0].insight_data : {};
    const medicalData = medicalInsights.length > 0 ? medicalInsights[0].insight_data : {};
    const trainingData = trainingInsights.length > 0 ? trainingInsights[0].insight_data : {};

    // Build context for AI synthesis
    const context = `
USER HEALTH PROFILE DATA:

NUTRITION:
${JSON.stringify(nutritionData, null, 2)}

MEDICAL:
${JSON.stringify(medicalData, null, 2)}

TRAINING:
${JSON.stringify(trainingData, null, 2)}

Synthesize this information into a comprehensive health intelligence profile. Provide:
1. A concise summary of nutrition needs and current plan
2. Key medical considerations that impact training
3. Training program phase and goals
4. Important connections between these three areas
5. Any potential conflicts or concerns (e.g., medical conditions affecting training capacity)
`;

    // Call Lovable AI for synthesis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a health intelligence AI that synthesizes nutrition, medical, and training data into actionable insights.' 
          },
          { role: 'user', content: context }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI synthesis error:', aiResponse.status, errorText);
      throw new Error(`AI synthesis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiSynthesis = aiData.choices[0].message.content;

    // Calculate profile data summaries
    const profileData: any = {};
    
    if (nutritionData && Object.keys(nutritionData).length > 0) {
      profileData.nutrition_summary = {
        daily_calories: nutritionData.daily_calories || null,
        macros: nutritionData.macros || null,
        meal_timing: nutritionData.meal_timing || [],
        supplements: nutritionData.supplements || []
      };
    }

    if (medicalData && Object.keys(medicalData).length > 0) {
      profileData.medical_summary = {
        active_conditions: medicalData.conditions?.map((c: any) => c.name) || [],
        medications: medicalData.medications || [],
        allergies: medicalData.allergies || [],
        contraindications: medicalData.contraindications || []
      };
    }

    if (trainingData && Object.keys(trainingData).length > 0) {
      profileData.training_summary = {
        program_name: trainingData.program_name || null,
        current_phase: trainingData.current_phase || null,
        weekly_volume_km: trainingData.weekly_volume_km || null,
        weekly_schedule: trainingData.weekly_schedule || [],
        goal_race_date: trainingData.goal_race_date || null
      };
    }

    // Store or update health profile
    const { data: existingProfile } = await supabase
      .from('user_health_profiles')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = (existingProfile?.version || 0) + 1;

    const { data: profile, error: profileError } = await supabase
      .from('user_health_profiles')
      .insert({
        user_id: userId,
        profile_data: profileData,
        ai_synthesis: aiSynthesis,
        version: newVersion
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    console.log(`Health profile v${newVersion} created for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, profile, version: newVersion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error building health profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
