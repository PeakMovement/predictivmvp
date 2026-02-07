import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BriefingRequest {
  user_id?: string;
  category?: 'full' | 'recovery' | 'sleep' | 'activity' | 'goals' | 'tip';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request - support both manual invocation and cron
    let userId: string | null = null;
    let category: 'full' | 'recovery' | 'sleep' | 'activity' | 'goals' | 'tip' = 'full';
    try {
      const body = await req.json() as BriefingRequest;
      userId = body.user_id || null;
      category = body.category || 'full';
    } catch {
      // No body provided - cron job will generate for all users
    }

    // If no specific user, generate for all users with wearable data
    let userIds: string[] = [];
    if (userId) {
      userIds = [userId];
    } else {
      // Get all users with recent wearable data
      const { data: recentUsers } = await supabase
        .from("wearable_sessions")
        .select("user_id")
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .limit(100);
      
      if (recentUsers) {
        userIds = [...new Set(recentUsers.map(u => u.user_id))];
      }
    }

    console.log(`[generate-daily-briefing] Processing ${userIds.length} users for category: ${category}`);

    const results = [];
    const today = new Date().toISOString().split("T")[0];

    for (const uid of userIds) {
      try {
        // Check if briefing already exists for today
        const { data: existingBriefing } = await supabase
          .from("daily_briefings")
          .select("id")
          .eq("user_id", uid)
          .eq("date", today)
          .eq("category", category)
          .maybeSingle();

        if (existingBriefing) {
          console.log(`[generate-daily-briefing] Briefing already exists for user ${uid}, category ${category}`);
          continue;
        }

        // ─── LOAD WEARABLE SUMMARY (last 7 days) ────────────────────────────
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        const { data: wearableSummary } = await supabase
          .from("wearable_summary")
          .select("*")
          .eq("user_id", uid)
          .gte("date", sevenDaysAgoStr)
          .order("date", { ascending: false });

        // ─── LOAD WEARABLE SESSIONS (last 3) ────────────────────────────────
        const { data: wearableSessions } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(3);

        // ─── LOAD USER UPLOADED DOCUMENTS ────────────────────────────────────
        const { data: userDocuments } = await supabase
          .from("user_documents")
          .select("document_type, file_name, parsed_content, ai_summary, tags")
          .eq("user_id", uid)
          .eq("processing_status", "completed")
          .order("uploaded_at", { ascending: false })
          .limit(5);

        // ─── LOAD USER MEMORY ────────────────────────────────────────────────
        const { data: memoryBank } = await supabase
          .from("yves_memory_bank")
          .select("memory_key, memory_value")
          .eq("user_id", uid);

        // ─── LOAD USER PROFILE DATA ──────────────────────────────────────────
        const { data: userProfile } = await supabase
          .from("user_profile")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: userContext } = await supabase
          .from("user_context_enhanced")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        // ─── LOAD RECENT SYMPTOM CHECK-INS ───────────────────────────────────
        const { data: symptomCheckIns } = await supabase
          .from("symptom_check_ins")
          .select("symptom_type, severity, body_location, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(5);

        // ─── LOAD USER ADAPTATION PROFILE (ENGAGEMENT LEARNING) ──────────────
        const { data: adaptationProfile } = await supabase
          .from("user_adaptation_profile")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        // ─── LOAD RISK TRAJECTORIES (PREDICTIVE WARNINGS) ─────────────────────
        const { data: riskTrajectories } = await supabase
          .from("risk_trajectories")
          .select("*")
          .eq("user_id", uid)
          .order("predicted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // ─── LOAD USER HEALTH PROFILE (DOCUMENT-DRIVEN PERSONALIZATION) ──────
        const { data: healthProfile } = await supabase
          .from("user_health_profiles")
          .select("*")
          .eq("user_id", uid)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        // ─── LOAD EXTENDED PROFILE DATA FOR DEEP PERSONALIZATION ─────────────
        const { data: trainingProfile } = await supabase
          .from("user_training")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: nutritionProfile } = await supabase
          .from("user_nutrition")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: lifestyleProfile } = await supabase
          .from("user_lifestyle")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: interestsProfile } = await supabase
          .from("user_interests")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: mindsetProfile } = await supabase
          .from("user_mindset")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: recoveryProfile } = await supabase
          .from("user_recovery")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        const { data: wellnessGoals } = await supabase
          .from("user_wellness_goals")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        // ─── LOAD TONE PREFERENCE FROM PROFILES ──────────────────────────────
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("tone_preference, memory_cleared_at")
          .eq("id", uid)
          .maybeSingle();

        // ─── LOAD ENGAGEMENT HISTORY FOR RELATIONSHIP METRICS ─────────────────
        const { data: engagementEvents } = await supabase
          .from("engagement_events")
          .select("event_type, created_at, metadata")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50);

        // ─── LOAD RECOMMENDATION OUTCOMES FOR LEARNING ────────────────────────
        const { data: recOutcomes } = await supabase
          .from("recommendation_outcomes")
          .select("outcome_type, user_feedback, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(20);

        // ─── LOAD HISTORICAL BRIEFINGS FOR PATTERN RECOGNITION ────────────────
        const { data: pastBriefings } = await supabase
          .from("daily_briefings")
          .select("date, category, content")
          .eq("user_id", uid)
          .order("date", { ascending: false })
          .limit(7);

        // ─── CALCULATE DATA MATURITY ──────────────────────────────────────────
        const { data: dataMaturity } = await supabase
          .from("user_data_maturity")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        // ─── BUILD CONTEXT DATA ──────────────────────────────────────────────
        const contextData: Record<string, unknown> = {
          wearable_summary: wearableSummary || [],
          wearable_sessions: wearableSessions || [],
          user_documents: userDocuments || [],
          memory_bank: memoryBank || [],
          user_profile: userProfile || null,
          user_context: userContext || null,
          symptom_check_ins: symptomCheckIns || [],
          adaptation_profile: adaptationProfile || null,
          risk_trajectories: riskTrajectories || null,
          health_profile: healthProfile || null,
          training_profile: trainingProfile || null,
          nutrition_profile: nutritionProfile || null,
          lifestyle_profile: lifestyleProfile || null,
          interests_profile: interestsProfile || null,
          mindset_profile: mindsetProfile || null,
          recovery_profile: recoveryProfile || null,
          wellness_goals: wellnessGoals || null,
          profiles_data: profilesData || null,
          engagement_events: engagementEvents || [],
          recommendation_outcomes: recOutcomes || [],
          past_briefings: pastBriefings || [],
          data_maturity: dataMaturity || null,
        };

        const hasWearableData = (wearableSummary && wearableSummary.length > 0) || 
                                (wearableSessions && wearableSessions.length > 0);

        // ─── COACHING MODE CLASSIFICATION ────────────────────────────────────
        // Classify user context into one of: general_wellness, performance, rehab
        type CoachingMode = 'general_wellness' | 'performance' | 'rehab';
        
        const classifyCoachingMode = (): CoachingMode => {
          // Check for rehab indicators from profile and symptoms
          const hasActiveInjuries = userProfile?.injuries?.length > 0;
          const hasConditions = userProfile?.conditions?.length > 0;
          
          // Check for recent symptoms indicating rehab mode
          const hasRecentSymptoms = symptomCheckIns && symptomCheckIns.length > 0;
          const hasSevereSymptoms = symptomCheckIns?.some(s => 
            s.severity === 'severe' || s.severity === 'moderate'
          );
          
          // Check wearable data for overload signals
          const latestSummary = wearableSummary?.[0];
          const isOverloaded = latestSummary?.acwr !== null && latestSummary?.acwr > 1.5;
          const highStrain = latestSummary?.strain !== null && latestSummary?.strain > 150;
          
          if (hasActiveInjuries || isOverloaded || highStrain || hasSevereSymptoms) {
            return 'rehab';
          }

          // Check for performance indicators
          const performanceGoals = ['performance', 'strength', 'endurance', 'speed', 
            'muscle', 'training', 'competition', 'race', 'marathon', 'triathlon', 
            'gym', 'running', 'cycling', 'swimming', 'conditioning'];
          
          const hasPerformanceGoals = userProfile?.goals?.some((g: string) => 
            performanceGoals.some(pg => g.toLowerCase().includes(pg))
          );
          const hasHighActivityLevel = userProfile?.activity_level === 'very_active' || 
            userProfile?.activity_level === 'extremely_active';
          const hasOptimalACWR = latestSummary?.acwr !== null && 
            latestSummary?.acwr >= 0.8 && latestSummary?.acwr <= 1.3;

          if (hasPerformanceGoals || hasHighActivityLevel || hasOptimalACWR) {
            return 'performance';
          }

          // Default to general wellness
          return 'general_wellness';
        };

        const coaching_mode: CoachingMode = classifyCoachingMode();
        console.log(`[generate-daily-briefing] Coaching mode: ${coaching_mode} for user ${uid}`);

        // ─── CALCULATE RELATIONSHIP METRICS ───────────────────────────────────
        type RelationshipStage = 'new' | 'regular' | 'established';
        const calculateRelationshipStage = (): { stage: RelationshipStage; daysActive: number; engagementLevel: string } => {
          const createdAt = userProfile?.created_at || new Date().toISOString();
          const daysActive = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

          // Calculate engagement level from recent events
          const recentEvents = engagementEvents?.filter(e => {
            const eventDate = new Date(e.created_at);
            const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 7;
          }) || [];

          let engagementLevel = 'low';
          if (recentEvents.length > 20) engagementLevel = 'very_high';
          else if (recentEvents.length > 10) engagementLevel = 'high';
          else if (recentEvents.length > 5) engagementLevel = 'moderate';

          let stage: RelationshipStage = 'new';
          if (daysActive > 56) stage = 'established';
          else if (daysActive > 14) stage = 'regular';

          return { stage, daysActive, engagementLevel };
        };

        const relationshipMetrics = calculateRelationshipStage();
        console.log(`[generate-daily-briefing] Relationship: ${relationshipMetrics.stage} (${relationshipMetrics.daysActive} days), engagement: ${relationshipMetrics.engagementLevel}`);

        // ─── CALCULATE HISTORICAL COMPARISONS ─────────────────────────────────
        const calculateHistoricalContext = (): Record<string, unknown> => {
          if (!wearableSessions || wearableSessions.length === 0) return {};

          const latest = wearableSessions[0];
          const context: Record<string, unknown> = {};

          // Compare to 30-day averages if we have enough data
          if (wearableSessions.length >= 3) {
            const readinessScores = wearableSessions.filter(s => s.readiness_score).map(s => s.readiness_score);
            const sleepScores = wearableSessions.filter(s => s.sleep_score).map(s => s.sleep_score);
            const hrvValues = wearableSessions.filter(s => s.hrv_avg).map(s => s.hrv_avg);

            if (readinessScores.length > 0 && latest.readiness_score) {
              const avg = readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length;
              const max = Math.max(...readinessScores);
              context.readiness_comparison = {
                current: latest.readiness_score,
                recent_avg: Math.round(avg),
                recent_max: max,
                trend: latest.readiness_score > avg ? 'above_average' : 'below_average'
              };
            }

            if (sleepScores.length > 0 && latest.sleep_score) {
              const avg = sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length;
              const max = Math.max(...sleepScores);
              context.sleep_comparison = {
                current: latest.sleep_score,
                recent_avg: Math.round(avg),
                recent_max: max,
                is_best: latest.sleep_score >= max
              };
            }

            if (hrvValues.length > 0 && latest.hrv_avg) {
              const avg = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
              context.hrv_comparison = {
                current: Math.round(latest.hrv_avg),
                recent_avg: Math.round(avg),
                deviation_pct: Math.round(((latest.hrv_avg - avg) / avg) * 100)
              };
            }
          }

          return context;
        };

        const historicalContext = calculateHistoricalContext();

        // ─── PERSONA CLASSIFICATION ───────────────────────────────────────────
        type PersonaType = 'analytical' | 'intuitive' | 'achiever' | 'cautious' | 'balanced';

        const classifyPersona = (): PersonaType => {
          // Analyze recommendation outcomes for motivation type
          const outcomes = recOutcomes || [];
          const followedCount = outcomes.filter(o => o.outcome_type === 'followed').length;
          const followRate = outcomes.length > 0 ? followedCount / outcomes.length : 0.5;

          // Check for analytical behavior (checks data frequently)
          const dataCheckEvents = engagementEvents?.filter(e =>
            e.event_type === 'app_opened' || e.event_type === 'briefing_viewed'
          ) || [];
          const isAnalytical = dataCheckEvents.length > 15; // High frequency checks

          // Check for achiever traits (high goals, high performance mode)
          const hasAmbitiousGoals = wellnessGoals?.priority === 'high' ||
            userProfile?.goals?.some((g: string) =>
              g.toLowerCase().includes('compete') ||
              g.toLowerCase().includes('pr') ||
              g.toLowerCase().includes('performance')
            );

          // Check for cautious behavior (frequent symptom logging, low risk tolerance)
          const symptomLogRate = symptomCheckIns?.length || 0;
          const isCautious = symptomLogRate > 3 || followRate < 0.3;

          if (isAnalytical && hasAmbitiousGoals) return 'analytical';
          if (hasAmbitiousGoals && followRate > 0.7) return 'achiever';
          if (isCautious) return 'cautious';
          if (!isAnalytical && followRate > 0.6) return 'intuitive';

          return 'balanced';
        };

        const persona = classifyPersona();
        console.log(`[generate-daily-briefing] Persona: ${persona}`);

        // ─── BUILD PROMPT CONTEXT ────────────────────────────────────────────
        let promptContext = "";

        // Add Oura Ring data - ONLY reference populated fields
        if (hasWearableData) {
          if (wearableSummary && wearableSummary.length > 0) {
            const avgStrain = wearableSummary.reduce((sum, s) => sum + (s.strain || 0), 0) / wearableSummary.length;
            const avgAcwr = wearableSummary.reduce((sum, s) => sum + (s.acwr || 0), 0) / wearableSummary.length;
            const latestDate = wearableSummary[0]?.date;
            
            promptContext += `Oura Ring Training Load (7 days):
- Avg Strain: ${avgStrain.toFixed(1)}
- Avg ACWR: ${avgAcwr.toFixed(2)}
- Latest Sync: ${latestDate}\n\n`;
          }

          if (wearableSessions && wearableSessions.length > 0) {
            // Only calculate averages for fields that have data
            const sessionsWithReadiness = wearableSessions.filter(s => s.readiness_score !== null);
            const sessionsWithSleep = wearableSessions.filter(s => s.sleep_score !== null);
            const sessionsWithActivity = wearableSessions.filter(s => s.activity_score !== null);

            promptContext += `Oura Ring Recovery (3 days):\n`;

            if (sessionsWithReadiness.length > 0) {
              const avgReadiness = sessionsWithReadiness.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / sessionsWithReadiness.length;
              promptContext += `- Avg Readiness: ${avgReadiness.toFixed(0)}\n`;
            }

            if (sessionsWithSleep.length > 0) {
              const avgSleep = sessionsWithSleep.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sessionsWithSleep.length;
              promptContext += `- Avg Sleep Score: ${avgSleep.toFixed(0)}\n`;
            }

            if (sessionsWithActivity.length > 0) {
              const avgActivity = sessionsWithActivity.reduce((sum, s) => sum + (s.activity_score || 0), 0) / sessionsWithActivity.length;
              promptContext += `- Avg Activity Score: ${avgActivity.toFixed(0)}\n`;
            }

            // Add latest session activity metrics - only populated fields
            const latestSession = wearableSessions[0];
            if (latestSession) {
              const activityParts: string[] = [];
              if (latestSession.total_steps) activityParts.push(`${latestSession.total_steps} steps`);
              if (latestSession.active_calories) activityParts.push(`${latestSession.active_calories} active cal`);
              if (latestSession.spo2_avg) activityParts.push(`SpO2: ${latestSession.spo2_avg}%`);
              
              if (activityParts.length > 0) {
                promptContext += `- Latest (${latestSession.date}): ${activityParts.join(", ")}\n`;
              }
            }
            promptContext += "\n";
          }
        }

        // Add user documents context
        if (userDocuments && userDocuments.length > 0) {
          promptContext += `User Documents:\n`;
          for (const doc of userDocuments) {
            promptContext += `- ${doc.document_type}: `;
            if (doc.ai_summary) {
              promptContext += `${doc.ai_summary.slice(0, 150)}...\n`;
            } else if (doc.tags && doc.tags.length > 0) {
              promptContext += `Tags: ${doc.tags.join(", ")}\n`;
            } else {
              promptContext += `${doc.file_name}\n`;
            }
          }
          promptContext += "\n";
        }

        // Add memory bank context
        if (memoryBank && memoryBank.length > 0) {
          promptContext += `User Preferences:\n`;
          memoryBank.slice(0, 5).forEach(m => {
            const valueStr = typeof m.memory_value === 'string' 
              ? m.memory_value 
              : JSON.stringify(m.memory_value).slice(0, 100);
            promptContext += `- ${m.memory_key}: ${valueStr}\n`;
          });
          promptContext += "\n";
        }

        // Add user profile info
        if (userProfile) {
          promptContext += `User Profile:\n`;
          if (userProfile.name) promptContext += `- Name: ${userProfile.name}\n`;
          if (userProfile.goals?.length > 0) promptContext += `- Goals: ${userProfile.goals.join(", ")}\n`;
          if (userProfile.activity_level) promptContext += `- Activity Level: ${userProfile.activity_level}\n`;
          if (userProfile.injuries?.length > 0) promptContext += `- Injuries: ${userProfile.injuries.join(", ")}\n`;
          if (userProfile.conditions?.length > 0) promptContext += `- Conditions: ${userProfile.conditions.join(", ")}\n`;
          promptContext += "\n";
        }

        // Add training profile for sport-specific language
        if (trainingProfile) {
          promptContext += `Training Profile:\n`;
          if (trainingProfile.preferred_activities?.length > 0) {
            promptContext += `- Preferred Activities: ${trainingProfile.preferred_activities.join(", ")}\n`;
          }
          if (trainingProfile.training_frequency) promptContext += `- Frequency: ${trainingProfile.training_frequency}\n`;
          if (trainingProfile.intensity_preference) promptContext += `- Intensity Preference: ${trainingProfile.intensity_preference}\n`;
          if (trainingProfile.equipment_access?.length > 0) {
            promptContext += `- Available Equipment: ${trainingProfile.equipment_access.join(", ")}\n`;
          }
          promptContext += "\n";
        }

        // Add lifestyle context for timing and constraints
        if (lifestyleProfile) {
          promptContext += `Lifestyle Context:\n`;
          if (lifestyleProfile.work_schedule) promptContext += `- Work Schedule: ${lifestyleProfile.work_schedule}\n`;
          if (lifestyleProfile.stress_level) promptContext += `- Stress Level: ${lifestyleProfile.stress_level}\n`;
          if (lifestyleProfile.daily_routine) promptContext += `- Daily Routine: ${lifestyleProfile.daily_routine}\n`;
          promptContext += "\n";
        }

        // Add interests for metaphor/analogy selection
        if (interestsProfile && (interestsProfile.hobbies?.length > 0 || interestsProfile.interests?.length > 0)) {
          promptContext += `Interests & Hobbies:\n`;
          if (interestsProfile.hobbies?.length > 0) {
            promptContext += `- Hobbies: ${interestsProfile.hobbies.join(", ")}\n`;
          }
          if (interestsProfile.interests?.length > 0) {
            promptContext += `- Interests: ${interestsProfile.interests.join(", ")}\n`;
          }
          promptContext += "\n";
        }

        // Add wellness goals with urgency context
        if (wellnessGoals) {
          promptContext += `Wellness Goals:\n`;
          if (wellnessGoals.goals?.length > 0) {
            promptContext += `- Goals: ${wellnessGoals.goals.join(", ")}\n`;
          }
          if (wellnessGoals.target_date) {
            const daysToGoal = Math.floor((new Date(wellnessGoals.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            promptContext += `- Target Date: ${wellnessGoals.target_date} (${daysToGoal} days away)\n`;
          }
          if (wellnessGoals.priority) promptContext += `- Priority: ${wellnessGoals.priority}\n`;
          promptContext += "\n";
        }

        // Add historical comparisons for progress tracking
        if (Object.keys(historicalContext).length > 0) {
          promptContext += `Historical Context:\n`;
          if (historicalContext.readiness_comparison) {
            const rc: any = historicalContext.readiness_comparison;
            promptContext += `- Readiness: ${rc.current} vs ${rc.recent_avg} avg (${rc.trend})\n`;
          }
          if (historicalContext.sleep_comparison) {
            const sc: any = historicalContext.sleep_comparison;
            promptContext += `- Sleep: ${sc.current} vs ${sc.recent_avg} avg${sc.is_best ? ' (personal best!)' : ''}\n`;
          }
          if (historicalContext.hrv_comparison) {
            const hc: any = historicalContext.hrv_comparison;
            promptContext += `- HRV: ${hc.current}ms vs ${hc.recent_avg}ms avg (${hc.deviation_pct > 0 ? '+' : ''}${hc.deviation_pct}%)\n`;
          }
          promptContext += "\n";
        }

        // Add relationship stage for tone calibration
        promptContext += `Relationship Metrics:\n`;
        promptContext += `- Days Active: ${relationshipMetrics.daysActive}\n`;
        promptContext += `- Relationship Stage: ${relationshipMetrics.stage}\n`;
        promptContext += `- Engagement Level: ${relationshipMetrics.engagementLevel}\n\n`;

        // Add recent symptoms context
        if (symptomCheckIns && symptomCheckIns.length > 0) {
          promptContext += `Recent Symptoms:\n`;
          symptomCheckIns.forEach(s => {
            const date = new Date(s.created_at);
            const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
            const timeLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;
            promptContext += `- ${s.symptom_type} (${s.severity})`;
            if (s.body_location) promptContext += ` - ${s.body_location}`;
            promptContext += ` - ${timeLabel}\n`;
          });
          promptContext += "\n";
        }

        // Add predictive warnings (if risk trajectories exist)
        if (riskTrajectories) {
          const predictions = riskTrajectories.predictions as any;
          const highRiskPredictions: string[] = [];

          if (predictions?.three_day) {
            Object.entries(predictions.three_day).forEach(([metric, data]: [string, any]) => {
              if (data.risk_level === 'high') {
                highRiskPredictions.push(`${metric} trending toward high risk in 3 days`);
              }
            });
          }

          if (highRiskPredictions.length > 0) {
            promptContext += `Predictive Warnings (3-day outlook):\n`;
            highRiskPredictions.forEach(warning => {
              promptContext += `- ${warning}\n`;
            });
            promptContext += "\n";
          }
        }

        // Add document-driven micro-personalization
        if (healthProfile?.profile_data) {
          const profileData = healthProfile.profile_data as any;

          if (profileData.medical_summary) {
            const medSummary = profileData.medical_summary;
            if (medSummary.contraindications && medSummary.contraindications.length > 0) {
              promptContext += `Medical Considerations:\n`;
              medSummary.contraindications.forEach((contraindication: string) => {
                promptContext += `- ${contraindication}\n`;
              });
              promptContext += "\n";
            }
          }

          if (profileData.training_summary) {
            const trainingSummary = profileData.training_summary;
            if (trainingSummary.current_phase) {
              promptContext += `Training Program:\n`;
              promptContext += `- Phase: ${trainingSummary.current_phase}\n`;
              if (trainingSummary.program_name) {
                promptContext += `- Program: ${trainingSummary.program_name}\n`;
              }
              if (trainingSummary.weekly_volume_km) {
                promptContext += `- Weekly Volume: ${trainingSummary.weekly_volume_km}km\n`;
              }
              promptContext += "\n";
            }
          }
        }

        // Add metric emphasis based on engagement learning
        let metricEmphasis = "";
        if (adaptationProfile?.metric_importance_weights) {
          const weights = adaptationProfile.metric_importance_weights as Record<string, number>;
          const topMetrics = Object.entries(weights)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([metric]) => metric);

          if (topMetrics.length > 0) {
            metricEmphasis = `\nMETRIC EMPHASIS: The user engages most with: ${topMetrics.join(", ")}. Prioritize these metrics in your analysis.\n`;
          }
        }

        // ─── BUILD TONE GUIDANCE BASED ON COACHING MODE ─────────────────────
        const toneGuidance: Record<CoachingMode, string> = {
          general_wellness: `Adopt a CALM, REASSURING tone. Be supportive and low-pressure. Use gentle suggestions like "consider", "you might enjoy". Validate small wins. Focus on overall wellbeing.`,
          performance: `Adopt a CONFIDENT, MOTIVATING tone. Be directive and goal-oriented. Give clear instructions. Challenge them appropriately. Reference their goals and metrics to drive action.`,
          rehab: `Adopt a CAUTIOUS, PROTECTIVE tone. Prioritize safety above all. Be precise about what to do AND what to avoid. Acknowledge any frustration. Never suggest pushing through symptoms.`
        };

        // Adapt tone based on engagement learning
        if (adaptationProfile) {
          const followThroughRate = adaptationProfile.follow_through_rate || 0;
          const effectiveTone = adaptationProfile.effective_tone;

          // If follow-through is low and user responds better to different tone
          if (followThroughRate < 40 && effectiveTone && effectiveTone !== 'balanced') {
            if (effectiveTone === 'coach') {
              toneGuidance[coaching_mode] += ` Note: This user responds better to direct, no-nonsense coaching language. Be more directive.`;
            } else if (effectiveTone === 'warm' || effectiveTone === 'supportive') {
              toneGuidance[coaching_mode] += ` Note: This user responds better to empathetic, supportive language. Be more encouraging.`;
            } else if (effectiveTone === 'strategic') {
              toneGuidance[coaching_mode] += ` Note: This user responds better to analytical, data-driven language. Reference specific metrics more.`;
            }
          }

          // If follow-through is high, maintain current tone
          if (followThroughRate > 70) {
            toneGuidance[coaching_mode] += ` Note: Current approach is working well (${followThroughRate}% follow-through). Maintain consistency.`;
          }
        }

        // ─── BUILD SYMPTOM ACKNOWLEDGEMENT INSTRUCTION ─────────────────────
        const hasRecentSymptoms = symptomCheckIns && symptomCheckIns.length > 0;
        const symptomAcknowledgement = hasRecentSymptoms ? `
SYMPTOM ACKNOWLEDGEMENT (MANDATORY):
The user has logged recent symptoms. You MUST acknowledge these FIRST before discussing metrics or recommendations.
Examples: "I see you've been dealing with [symptom] recently." or "Given the [symptom] you logged, let's factor that in."
This should feel natural and human. Do NOT provide medical advice - just acknowledge.
` : '';

        // ─── CALL LOVABLE AI ────────────────────────────────────────────────
        let systemPrompt: string;
        let userPrompt: string;
        let maxTokens = 300;

        if (category === 'full') {
          // Check if user has a name for personalization
          const userName = userProfile?.name?.split(' ')[0] || null;
          const nameInstruction = userName ? `
NAME USAGE: The user's first name is "${userName}". Do NOT use it by default. Only use the name when it adds emotional or contextual value — such as praising consistency, expressing concern, referencing a previously reported issue, or acknowledging multi-day progress. Never start with the name. Never use it more than once per response. Never use it in purely technical statements.
` : '';

          // Build sport-specific vocabulary guidance
          let sportVocabulary = "";
          if (trainingProfile?.preferred_activities && trainingProfile.preferred_activities.length > 0) {
            const activities = trainingProfile.preferred_activities;
            sportVocabulary = `\nSPORT-SPECIFIC LANGUAGE: Use terminology from their preferred activities (${activities.join(", ")}).\n`;

            if (activities.some((a: string) => a.toLowerCase().includes('run'))) {
              sportVocabulary += `- Running terms: pace, splits, cadence, stride, easy run, tempo, intervals\n`;
            }
            if (activities.some((a: string) => a.toLowerCase().includes('cycl'))) {
              sportVocabulary += `- Cycling terms: power zones, cadence, spin, ride, watts, FTP\n`;
            }
            if (activities.some((a: string) => a.toLowerCase().includes('swim'))) {
              sportVocabulary += `- Swimming terms: laps, technique, form, sets, pool session\n`;
            }
            if (activities.some((a: string) => a.toLowerCase().includes('lift') || a.toLowerCase().includes('gym') || a.toLowerCase().includes('strength'))) {
              sportVocabulary += `- Strength terms: sets, reps, volume, progressive overload, rest days\n`;
            }
            if (activities.some((a: string) => a.toLowerCase().includes('yoga') || a.toLowerCase().includes('pilates'))) {
              sportVocabulary += `- Mind-body terms: practice, flow, movement, breathwork, flexibility\n`;
            }
          }

          // Build persona-specific writing guidelines
          const personaGuidelines: Record<PersonaType, string> = {
            analytical: `PERSONA: Analytical type. Use data-driven language with specific percentages and comparisons. Reference trends and patterns. Example: "Your HRV is 15% below your 7-day average, indicating accumulated fatigue."`,
            intuitive: `PERSONA: Intuitive type. Use body-focused, feeling-based language. Less numbers, more sensations. Example: "Your body's signals suggest it hasn't fully recovered - listen to that."`,
            achiever: `PERSONA: Achievement-oriented. Use goal-focused, forward-looking language. Frame recommendations as opportunities. Example: "This strong recovery window is perfect for hitting that interval workout."`,
            cautious: `PERSONA: Safety-conscious. Emphasize protection and gradual progression. Validate concerns. Example: "Better to hold back today and ensure you can train strong tomorrow."`,
            balanced: `PERSONA: Balanced approach. Mix data with intuition, goals with safety. Moderate tone.`
          };

          // Build relationship stage guidance
          const relationshipGuidance: Record<RelationshipStage, string> = {
            new: `RELATIONSHIP STAGE: New user (${relationshipMetrics.daysActive} days). Be more educational and explanatory. Define terms briefly. Build trust through transparency. Example: "ACWR (Acute:Chronic Workload Ratio) shows your training balance..."`,
            regular: `RELATIONSHIP STAGE: Regular user (${relationshipMetrics.daysActive} days). Use shared shorthand. Assume familiarity with metrics. Be more conversational. Example: "Your ACWR is climbing again..."`,
            established: `RELATIONSHIP STAGE: Established relationship (${relationshipMetrics.daysActive} days). Use insider language and reference patterns you've observed together. Example: "This matches your typical Tuesday dip we've been tracking..."`,
          };

          // Build temporal context
          const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const temporalContext = `TEMPORAL CONTEXT: Today is ${dayOfWeek}. If the user has weekly patterns in their lifestyle or training data, acknowledge them (e.g., "Coming off the weekend..." or "Mid-week check-in...").`;

          // Build historical reference guidance
          let historicalGuidance = "";
          if (Object.keys(historicalContext).length > 0) {
            historicalGuidance = `\nHISTORICAL COMPARISONS: Reference their personal patterns when relevant:`;
            if (historicalContext.readiness_comparison) {
              const rc: any = historicalContext.readiness_comparison;
              if (rc.current === rc.recent_max) {
                historicalGuidance += `\n- This is their BEST readiness recently - celebrate this!`;
              } else if (rc.trend === 'below_average') {
                historicalGuidance += `\n- Readiness is below their recent average - acknowledge this dip`;
              }
            }
            if (historicalContext.sleep_comparison) {
              const sc: any = historicalContext.sleep_comparison;
              if (sc.is_best) {
                historicalGuidance += `\n- This is their BEST sleep score - emphasize this win!`;
              }
            }
          }

          // Build metaphor/analogy guidance
          let metaphorGuidance = "";
          if (interestsProfile && (interestsProfile.hobbies?.length > 0 || interestsProfile.interests?.length > 0)) {
            const interests = [...(interestsProfile.hobbies || []), ...(interestsProfile.interests || [])];
            metaphorGuidance = `\nMETAPHOR GUIDANCE: Draw occasional analogies from their interests (${interests.slice(0, 3).join(", ")}) to make concepts relatable. Don't force it - only when natural.`;
          }

          // Build goal urgency guidance
          let goalUrgency = "";
          if (wellnessGoals?.target_date) {
            const daysToGoal = Math.floor((new Date(wellnessGoals.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysToGoal > 0 && daysToGoal < 30) {
              goalUrgency = `\nGOAL URGENCY: Their goal deadline is ${daysToGoal} days away. Frame recommendations in context of this timeline. Be strategic about prioritization.`;
            } else if (daysToGoal > 0) {
              goalUrgency = `\nGOAL CONTEXT: Their goal is ${daysToGoal} days out. Maintain long-term perspective. Emphasize consistency over urgency.`;
            }
          }

          systemPrompt = `You are Yves, a calm, highly experienced performance coach and clinician.

═══ CORE IDENTITY ═══
You speak to users as an intelligent human would, not as a system.
Your goal is to help users make better daily decisions, not to scare or control them.
You avoid alarmist language, certainty, and overuse of medical terms.
You never mention data sources, systems, models, or detection mechanisms.
Speak WITH the user, not AT the user.

═══ GROUNDED OBSERVATION RULE ═══
Every response MUST begin with a grounded observation about the user's recent pattern.
The observation must reference: a trend, a direction of change, and a short timeframe.
Never give advice without first anchoring it to an observable pattern.
Use language like: "You've been trending toward…", "Over the past few days…", "Recently, your training has…"
Never provide generic advice or advice without context.

═══ SOFT COUNTERFACTUAL ═══
When appropriate, include ONE soft counterfactual sentence explaining what is likely to happen if nothing changes today.
Rules: No certainty, no injury guarantees, no fear language, no urgency. Tone must be informational and calm.
Examples: "If this pattern continues today, recovery may feel slightly delayed." / "Without a small adjustment, fatigue may carry into tomorrow."
The counterfactual is optional. Never include more than one.

Generate a concise daily briefing (about 150 words) with 4 sections:

1. Recovery: Readiness and sleep score trends
2. Training Load: Training balance status
3. Recommendations: 1-2 specific adjustments based on their data and any uploaded documents
4. Motivation: Brief encouragement aligned with their goals

═══ TONE MODE SELECTION (MANDATORY) ═══
Before generating the briefing, determine exactly ONE tone mode. Never mix tones.
• AFFIRMING — Positive trends, good adherence. Celebrate consistency.
• GUIDING — Neutral trends. Calm adjustment suggestions.
• CAUTIOUS — Rising risk, early warning signs. Measured but clear.
• REASSURING — Post-alert, uncertainty, anxiety reduction.
Selection is based on: deviation from baseline, consecutive days of a pattern, injury/symptom history, previous response to similar advice.

═══ MODULAR PROMPT STRUCTURE ═══
Assemble the briefing from these components — use 2–4, never all at once, vary structure between days:
• Observation (required) — a grounded pattern observation
• Affirmation (optional) — acknowledge effort or consistency
• Soft counterfactual (optional) — one calm "if nothing changes" sentence
• Recommendation (required) — specific, actionable suggestion
• Gentle closing question (optional) — invite reflection or check-in
Do NOT follow a fixed paragraph structure.

${toneGuidance[coaching_mode]}
${symptomAcknowledgement}${nameInstruction}${metricEmphasis}
${personaGuidelines[persona]}
${relationshipGuidance[relationshipMetrics.stage]}
${temporalContext}
${sportVocabulary}${historicalGuidance}${metaphorGuidance}${goalUrgency}

COACHING LANGUAGE (use instead of clinical phrasing):
• "Metrics indicate" → "What I'm seeing suggests"
• "Consider reducing intensity" → "Let's ease off today"
• "Suboptimal recovery" → "Your body hasn't fully recharged"
• "Data suggests" → "It looks like"
• "Recommend" → "I'd suggest" or "Let's try"
• "Elevated strain" → "You've been pushing hard"
Speak like a trusted coach who knows their story, not a generic medical report.

═══ AUTONOMY-SUPPORTIVE FRAMING ═══
Recommendations must be framed as options, not commands. Support user autonomy.
Allowed: "Today could be a good opportunity to…", "You might benefit from…", "It may be worth considering…"
Disallowed: "You should", "You must", "Do this today"

═══ ANTI-SURVEILLANCE LANGUAGE ═══
Never imply monitoring or surveillance. This maintains trust.
Never say: "We detected", "The system flagged", "Your data shows", "Our analysis found", "Monitoring indicates"
Instead say: "It looks like", "You've been trending toward", "Today suggests", "What I'm seeing suggests"

If performance metrics are strong BUT symptoms are present, default to safety-oriented guidance.
Explain briefly: "Your metrics look solid, but the [symptom] changes today's priority."
Symptoms override metrics. Safety first.

═══ MEMORY REFERENCING ═══
Reference past behavior only when it improves clarity or trust. Memory should feel helpful, not heavy.
Allowed: "In the past, lighter days have helped you reset well.", "You've responded well to this approach before."
Disallowed: Overly long history recaps, referencing old data without relevance to today.

Use emoji section markers (🏃, 💪, 💡, 🎯). Be specific with actual numbers from the data. Keep it actionable.

TODAY'S FOCUS (MANDATORY):
ALWAYS end with a "Today's Focus" section containing ONE clear action with specific timing/duration.
Format: "🎯 Today's Focus: [single actionable item]"
Example: "🎯 Today's Focus: 20 minutes of easy movement and an early bedtime."
One focus only. No mixed messages.

═══ PRE-OUTPUT VALIDATION (MANDATORY) ═══
Before delivering the briefing, internally validate:
1. Does this feel like a human coach speaking?
2. Is the advice earned by context?
3. Is the tone appropriate?
4. Is the language calm and respectful?
5. Would this encourage trust, not compliance?
If any answer is "no", revise before output.

CRITICAL FORMATTING RULES:
- Use plain text only with emoji bullets
- DO NOT use markdown syntax (no asterisks, no bold, no underscores)
- Separate sections with a single blank line
- Use proper grammar and punctuation
- Only reference metrics that have actual data provided`;

          if (hasWearableData) {
            userPrompt = `Generate today's briefing based on the user's Oura Ring data and profile:\n\n${promptContext}`;
          } else if (userProfile) {
            userPrompt = `Generate a welcoming briefing for a new user. ${promptContext}\n\nProvide encouragement to connect their Oura Ring and start tracking their health journey.`;
          } else {
            userPrompt = `Generate a brief welcome message encouraging the user to complete their profile and connect their Oura Ring to unlock personalized health insights.`;
          }
        } else {
          // Category-specific mini-briefings with tone adaptation
          maxTokens = 150;
          const toneInstruction = toneGuidance[coaching_mode];
          
          const groundedRule = `Begin with a grounded observation about the user's recent pattern — referencing a trend, direction of change, and short timeframe. Never give advice without anchoring it to an observable pattern.`;
          
          const categoryPrompts: Record<string, { system: string; user: string }> = {
            recovery: {
              system: `You are Yves, a calm, experienced performance coach. Speak to the user as a human, not a system. ${groundedRule} Create a focused 60-word briefing about recovery status. Include readiness scores and recovery advice. Use emoji 🏃 at the start. Plain text only, no markdown. Only mention metrics that have actual data. ${toneInstruction}`,
              user: `${promptContext}\n\nFocus only on recovery metrics and advice.`
            },
            sleep: {
              system: `You are Yves, a calm, experienced performance coach. Speak to the user as a human, not a system. ${groundedRule} Create a focused 60-word briefing about sleep quality. Include sleep score and recommendations. Use emoji 😴 at the start. Plain text only, no markdown. Only mention metrics that have actual data. ${toneInstruction}`,
              user: `${promptContext}\n\nFocus only on sleep metrics and advice.`
            },
            activity: {
              system: `You are Yves, a calm, experienced performance coach. Speak to the user as a human, not a system. ${groundedRule} Create a focused 60-word briefing about activity. Include activity score, steps, and training advice. Use emoji 💪 at the start. Plain text only, no markdown. Only mention metrics that have actual data. ${toneInstruction}`,
              user: `${promptContext}\n\nFocus only on activity metrics and training advice.`
            },
            goals: {
              system: `You are Yves, a calm, experienced performance coach. Speak to the user as a human, not a system. ${groundedRule} Create a focused 60-word briefing about goal progress. Mention progress toward stated goals and provide encouragement. Use emoji 🎯 at the start. Plain text only, no markdown. ${toneInstruction}`,
              user: `${promptContext}\n\nFocus on progress toward the user's stated goals.`
            },
            tip: {
              system: `You are Yves, a calm, experienced performance coach. Speak to the user as a human, not a system. ${groundedRule} Create a focused 40-word actionable health tip. Use emoji 💡 at the start. Plain text only, no markdown. ${toneInstruction}`,
              user: `${promptContext}\n\nGive one specific, personalized tip based on their data.`
            }
          };

          const prompt = categoryPrompts[category];
          systemPrompt = prompt.system;
          userPrompt = (hasWearableData || userProfile || (userDocuments && userDocuments.length > 0)) 
            ? prompt.user 
            : `Generate a brief message encouraging the user to connect their Oura Ring for personalized ${category} insights.`;
        }

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            max_tokens: maxTokens,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`[generate-daily-briefing] AI error for user ${uid}:`, errorText);
          results.push({ user_id: uid, success: false, error: `AI error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        let briefingContent = aiData.choices[0]?.message?.content;

        if (!briefingContent) {
          console.error(`[generate-daily-briefing] AI returned no content for user ${uid}`);
          results.push({ user_id: uid, success: false, error: "AI returned no content" });
          continue;
        }

        // Clean up formatting - remove all markdown syntax
        briefingContent = briefingContent
          .replace(/\*\*/g, '')     // Remove bold markdown
          .replace(/\*/g, '')       // Remove asterisks
          .replace(/_/g, '')        // Remove underscores
          .replace(/#{1,6}\s/g, '') // Remove markdown headers
          .trim();

        // ─── SAVE TO DATABASE ────────────────────────────────────────────────
        const { error: insertError } = await supabase
          .from("daily_briefings")
          .upsert({
            user_id: uid,
            date: today,
            content: briefingContent,
            context_used: contextData,
            category: category,
          });

        if (insertError) {
          console.error(`[generate-daily-briefing] DB error for user ${uid}:`, insertError);
          results.push({ user_id: uid, success: false, error: insertError.message });
          continue;
        }

        console.log(`[generate-daily-briefing] Briefing generated for user ${uid}, category: ${category}`);
        results.push({ user_id: uid, success: true });

      } catch (userError) {
        console.error(`[generate-daily-briefing] Error for user ${uid}:`, userError);
        results.push({ user_id: uid, success: false, error: userError instanceof Error ? userError.message : "Unknown error" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const allFailed = successCount === 0 && results.length > 0;

    return new Response(
      JSON.stringify({
        success: !allFailed,
        message: allFailed 
          ? `Failed to generate briefings: ${results[0]?.error || "Unknown error"}`
          : `Generated ${successCount} briefing${successCount !== 1 ? 's' : ''}`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: allFailed ? 500 : 200,
      }
    );
  } catch (error) {
    console.error("[generate-daily-briefing] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
