import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataMaturityResult {
  maturity_level: 'insufficient' | 'emerging' | 'established' | 'mature';
  maturity_score: number;
  data_days: number;
  profile_completeness: number;
  wearable_connected: boolean;
  documents_count: number;
  symptom_checkins_count: number;
  breakdown: {
    wearable_score: number;
    profile_score: number;
    documents_score: number;
    symptoms_score: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id || null;
    } catch {
      // No body
    }

    if (!userId) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[calculate-data-maturity] Calculating for user ${userId}`);

    // Fetch all data sources in parallel
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [
      wearableSessionsResult,
      userProfileResult,
      userMedicalResult,
      userNutritionResult,
      userTrainingResult,
      userRecoveryResult,
      userWellnessGoalsResult,
      userLifestyleResult,
      userInterestsResult,
      userMindsetResult,
      documentsResult,
      symptomCheckInsResult,
      wearableTokensResult,
    ] = await Promise.all([
      supabase.from("wearable_sessions").select("date").eq("user_id", userId).gte("date", thirtyDaysAgoStr),
      supabase.from("user_profile").select("name, gender, dob, activity_level, goals").eq("user_id", userId).maybeSingle(),
      supabase.from("user_medical").select("conditions, medications").eq("user_id", userId).maybeSingle(),
      supabase.from("user_nutrition").select("diet_type, allergies").eq("user_id", userId).maybeSingle(),
      supabase.from("user_training").select("preferred_activities, training_frequency").eq("user_id", userId).maybeSingle(),
      supabase.from("user_recovery").select("sleep_hours, recovery_methods").eq("user_id", userId).maybeSingle(),
      supabase.from("user_wellness_goals").select("goals, priority").eq("user_id", userId).maybeSingle(),
      supabase.from("user_lifestyle").select("work_schedule, stress_level").eq("user_id", userId).maybeSingle(),
      supabase.from("user_interests").select("hobbies, interests").eq("user_id", userId).maybeSingle(),
      supabase.from("user_mindset").select("motivation_factors, mental_health_focus").eq("user_id", userId).maybeSingle(),
      supabase.from("user_documents").select("id").eq("user_id", userId).eq("processing_status", "completed"),
      supabase.from("symptom_check_ins").select("id").eq("user_id", userId),
      supabase.from("wearable_tokens").select("provider").eq("user_id", userId),
    ]);

    // Calculate unique days of wearable data
    const wearableDates = new Set(wearableSessionsResult.data?.map(s => s.date) || []);
    const dataDays = wearableDates.size;

    // Check wearable connection
    const wearableConnected = (wearableTokensResult.data?.length || 0) > 0;

    // Document count
    const documentsCount = documentsResult.data?.length || 0;

    // Symptom check-ins count
    const symptomCheckInsCount = symptomCheckInsResult.data?.length || 0;

    // Calculate profile completeness (10 profile sections, each worth 10%)
    let profileScore = 0;
    const profileSections = [
      userProfileResult.data?.name || userProfileResult.data?.gender || userProfileResult.data?.dob,
      userProfileResult.data?.activity_level,
      userProfileResult.data?.goals?.length > 0,
      userMedicalResult.data?.conditions || userMedicalResult.data?.medications,
      userNutritionResult.data?.diet_type || userNutritionResult.data?.allergies,
      userTrainingResult.data?.preferred_activities || userTrainingResult.data?.training_frequency,
      userRecoveryResult.data?.sleep_hours || userRecoveryResult.data?.recovery_methods,
      userWellnessGoalsResult.data?.goals || userWellnessGoalsResult.data?.priority,
      userLifestyleResult.data?.work_schedule || userLifestyleResult.data?.stress_level,
      userInterestsResult.data?.hobbies || userInterestsResult.data?.interests || userMindsetResult.data?.motivation_factors,
    ];

    profileSections.forEach(section => {
      if (section) profileScore += 10;
    });

    // Calculate component scores (each max 25 points)
    // Wearable score: 0-25 based on days of data (7 days = 10, 14 days = 18, 30 days = 25)
    let wearableScore = 0;
    if (dataDays >= 30) wearableScore = 25;
    else if (dataDays >= 21) wearableScore = 22;
    else if (dataDays >= 14) wearableScore = 18;
    else if (dataDays >= 7) wearableScore = 12;
    else if (dataDays >= 3) wearableScore = 6;
    else if (dataDays >= 1) wearableScore = 3;

    // Profile score: 0-25 based on completeness
    const normalizedProfileScore = Math.round(profileScore * 0.25);

    // Documents score: 0-25 (1 doc = 8, 3 docs = 18, 5+ docs = 25)
    let documentsScore = 0;
    if (documentsCount >= 5) documentsScore = 25;
    else if (documentsCount >= 3) documentsScore = 18;
    else if (documentsCount >= 1) documentsScore = 8;

    // Symptoms score: 0-25 (1 checkin = 5, 3 = 15, 5+ = 25)
    let symptomsScore = 0;
    if (symptomCheckInsCount >= 5) symptomsScore = 25;
    else if (symptomCheckInsCount >= 3) symptomsScore = 15;
    else if (symptomCheckInsCount >= 1) symptomsScore = 5;

    // Total maturity score (0-100)
    const maturityScore = wearableScore + normalizedProfileScore + documentsScore + symptomsScore;

    // Determine maturity level
    let maturityLevel: 'insufficient' | 'emerging' | 'established' | 'mature';
    if (maturityScore < 20 || dataDays < 3) {
      maturityLevel = 'insufficient';
    } else if (maturityScore < 45 || dataDays < 7) {
      maturityLevel = 'emerging';
    } else if (maturityScore < 70 || dataDays < 14) {
      maturityLevel = 'established';
    } else {
      maturityLevel = 'mature';
    }

    const result: DataMaturityResult = {
      maturity_level: maturityLevel,
      maturity_score: maturityScore,
      data_days: dataDays,
      profile_completeness: profileScore,
      wearable_connected: wearableConnected,
      documents_count: documentsCount,
      symptom_checkins_count: symptomCheckInsCount,
      breakdown: {
        wearable_score: wearableScore,
        profile_score: normalizedProfileScore,
        documents_score: documentsScore,
        symptoms_score: symptomsScore,
      },
    };

    // Upsert to database
    await supabase.from("user_data_maturity").upsert({
      user_id: userId,
      maturity_level: maturityLevel,
      maturity_score: maturityScore,
      data_days: dataDays,
      profile_completeness: profileScore,
      wearable_connected: wearableConnected,
      documents_count: documentsCount,
      symptom_checkins_count: symptomCheckInsCount,
      last_calculated: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    console.log(`[calculate-data-maturity] User ${userId}: ${maturityLevel} (score: ${maturityScore}, days: ${dataDays})`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[calculate-data-maturity] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
