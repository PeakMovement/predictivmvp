import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const intensityMultipliers = {
  'easy': 1.0,
  'moderate': 1.5,
  'hard': 2.0,
  'max': 2.5
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, date } = await req.json();
    const checkDate = date || new Date().toISOString().split('T')[0];


    // Get user's health profile
    const { data: profile } = await supabase
      .from('user_health_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!profile?.profile_data) {
      return new Response(
        JSON.stringify({ success: true, message: 'No health profile found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trainingPlan = profile.profile_data.training_summary?.weekly_schedule;
    const nutritionPlan = profile.profile_data.nutrition_summary;

    // Get today's day of week
    const dateObj = new Date(checkDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Get expected workout for today
    const expectedWorkout = trainingPlan?.find((w: any) => w.day === dayOfWeek);

    // Get actual Fitbit data
    const { data: actualTrend } = await supabase
      .from('fitbit_trends')
      .select('training_load, strain, date')
      .eq('date', checkDate)
      .maybeSingle();

    // Calculate training adherence
    let trainingAdherence = 1.0;
    const trainingDeviations: string[] = [];

    if (expectedWorkout && actualTrend) {
      const expectedLoad = (expectedWorkout.duration_min || 0) * 
                          (intensityMultipliers[expectedWorkout.intensity as keyof typeof intensityMultipliers] || 1.0);
      const actualLoad = actualTrend.training_load || 0;

      if (expectedLoad > 0) {
        const loadDifference = Math.abs(expectedLoad - actualLoad) / expectedLoad;
        
        if (loadDifference > 0.3) {
          trainingAdherence -= 0.5;
          trainingDeviations.push(`Training load mismatch: expected ${expectedLoad.toFixed(0)}, got ${actualLoad.toFixed(0)}`);
        } else if (loadDifference > 0.2) {
          trainingAdherence -= 0.2;
          trainingDeviations.push(`Minor training load deviation: ${(loadDifference * 100).toFixed(0)}%`);
        }
      }
    } else if (expectedWorkout && !actualTrend) {
      trainingAdherence = 0.0;
      trainingDeviations.push('Expected workout not completed');
    }

    // Store training adherence
    if (expectedWorkout) {
      await supabase.from('plan_adherence').upsert({
        user_id: userId,
        date: checkDate,
        plan_type: 'training',
        expected_data: expectedWorkout,
        actual_data: { training_load: actualTrend?.training_load, strain: actualTrend?.strain },
        adherence_score: Math.max(0, trainingAdherence),
        deviation_reasons: trainingDeviations
      }, {
        onConflict: 'user_id,date,plan_type'
      });
    }

    // Calculate nutrition adherence (if we have calorie data)
    const { data: fitbitDaily } = await supabase
      .from('fitbit_auto_data')
      .select('activity')
      .eq('user_id', userId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nutritionAdherence = 1.0;
    const nutritionDeviations: string[] = [];

    if (nutritionPlan?.daily_calories && fitbitDaily?.activity) {
      const expectedCalories = nutritionPlan.daily_calories;
      const actualCalories = fitbitDaily.activity.summary?.caloriesOut;

      if (actualCalories && expectedCalories) {
        const calorieDiff = Math.abs(actualCalories - expectedCalories) / expectedCalories;
        
        if (calorieDiff > 0.2) {
          nutritionAdherence -= 0.3;
          nutritionDeviations.push(`Calorie intake deviation: ${(calorieDiff * 100).toFixed(0)}%`);
        }
      }
    }

    // Store nutrition adherence
    if (nutritionPlan) {
      await supabase.from('plan_adherence').upsert({
        user_id: userId,
        date: checkDate,
        plan_type: 'nutrition',
        expected_data: { calories: nutritionPlan.daily_calories, macros: nutritionPlan.macros },
        actual_data: { calories: fitbitDaily?.activity?.summary?.caloriesOut },
        adherence_score: Math.max(0, nutritionAdherence),
        deviation_reasons: nutritionDeviations
      }, {
        onConflict: 'user_id,date,plan_type'
      });
    }


    return new Response(
      JSON.stringify({ 
        success: true, 
        training_adherence: trainingAdherence,
        nutrition_adherence: nutritionAdherence,
        deviations: [...trainingDeviations, ...nutritionDeviations]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating plan adherence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
