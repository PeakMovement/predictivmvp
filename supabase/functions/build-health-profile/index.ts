
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();

    console.log(`Building health profile for user ${userId}`);

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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const nutritionInsights = insights.filter(i => i.insight_type === 'nutrition');
    const medicalInsights = insights.filter(i => i.insight_type === 'medical');
    const trainingInsights = insights.filter(i => i.insight_type === 'training');

    const nutritionData = nutritionInsights.length > 0 ? nutritionInsights[0].insight_data : {};
    const medicalData = medicalInsights.length > 0 ? medicalInsights[0].insight_data : {};
    const trainingData = trainingInsights.length > 0 ? trainingInsights[0].insight_data : {};

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

    const ai = getAIProvider();

    const aiResponse = await ai.chat({
      messages: [
        {
          role: 'system',
          content: 'You are a health intelligence AI that synthesizes nutrition, medical, and training data into actionable insights.'
        },
        { role: 'user', content: context }
      ]
    });

    const aiSynthesis = aiResponse.content;

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

    const { data: existingProfile } = await supabase
      .from('user_health_profiles')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
