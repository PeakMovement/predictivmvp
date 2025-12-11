import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provider database with budget ranges and typical locations
const PROVIDER_DATABASE = {
  general_practitioner: {
    name: "General Practitioner",
    specialty: "Primary Care",
    budgetRange: { min: 50, max: 150 },
    urgencyLevel: "low",
    description: "First point of contact for general health concerns"
  },
  physiotherapist: {
    name: "Physiotherapist",
    specialty: "Physical Rehabilitation",
    budgetRange: { min: 80, max: 200 },
    urgencyLevel: "low",
    description: "Specializes in movement, pain, and injury recovery"
  },
  cardiologist: {
    name: "Cardiologist",
    specialty: "Heart & Cardiovascular",
    budgetRange: { min: 150, max: 400 },
    urgencyLevel: "medium",
    description: "Heart health specialist for cardiac concerns"
  },
  sleep_specialist: {
    name: "Sleep Specialist",
    specialty: "Sleep Medicine",
    budgetRange: { min: 200, max: 500 },
    urgencyLevel: "low",
    description: "Expert in sleep disorders and quality improvement"
  },
  sports_medicine: {
    name: "Sports Medicine Doctor",
    specialty: "Athletic Health",
    budgetRange: { min: 120, max: 350 },
    urgencyLevel: "medium",
    description: "Specializes in sports injuries and performance"
  },
  mental_health: {
    name: "Mental Health Professional",
    specialty: "Psychology/Psychiatry",
    budgetRange: { min: 100, max: 300 },
    urgencyLevel: "medium",
    description: "Support for mental health and wellness"
  },
  nutritionist: {
    name: "Nutritionist/Dietitian",
    specialty: "Nutrition",
    budgetRange: { min: 75, max: 200 },
    urgencyLevel: "low",
    description: "Expert in diet and nutritional health"
  },
  neurologist: {
    name: "Neurologist",
    specialty: "Nervous System",
    budgetRange: { min: 200, max: 450 },
    urgencyLevel: "medium",
    description: "Specializes in brain and nervous system conditions"
  },
  emergency: {
    name: "Emergency Services",
    specialty: "Emergency Medicine",
    budgetRange: { min: 0, max: 0 },
    urgencyLevel: "critical",
    description: "Immediate emergency care - call 911"
  },
  urgent_care: {
    name: "Urgent Care Clinic",
    specialty: "Urgent Care",
    budgetRange: { min: 100, max: 300 },
    urgencyLevel: "high",
    description: "Same-day care for non-life-threatening conditions"
  }
};

// Symptom to provider mapping
const SYMPTOM_PROVIDER_MAP: Record<string, string[]> = {
  "headache": ["neurologist", "general_practitioner"],
  "chest_pain": ["cardiologist", "emergency", "urgent_care"],
  "fatigue": ["general_practitioner", "sleep_specialist"],
  "muscle_pain": ["physiotherapist", "sports_medicine"],
  "joint_pain": ["physiotherapist", "sports_medicine"],
  "sleep_issues": ["sleep_specialist", "mental_health"],
  "anxiety": ["mental_health", "general_practitioner"],
  "depression": ["mental_health", "general_practitioner"],
  "digestive": ["general_practitioner", "nutritionist"],
  "respiratory": ["general_practitioner", "urgent_care"],
  "injury": ["sports_medicine", "physiotherapist", "urgent_care"],
  "heart": ["cardiologist", "emergency"],
  "nutrition": ["nutritionist", "general_practitioner"],
  "stress": ["mental_health", "general_practitioner"],
  "other": ["general_practitioner"]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse input
    const body = await req.json();
    const { 
      symptom_type, 
      budget_max = 500, 
      location = "any",
      urgency = "routine"
    } = body;

    if (!symptom_type) {
      return new Response(
        JSON.stringify({ error: 'symptom_type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[match-provider] Processing request for user ${user.id}: symptom=${symptom_type}, budget=${budget_max}, location=${location}`);

    // Get recommended provider types for this symptom
    const symptomKey = symptom_type.toLowerCase().replace(/\s+/g, '_');
    const recommendedProviders = SYMPTOM_PROVIDER_MAP[symptomKey] || SYMPTOM_PROVIDER_MAP["other"];

    // Filter and score providers
    const matches = recommendedProviders
      .map(providerKey => {
        const provider = PROVIDER_DATABASE[providerKey as keyof typeof PROVIDER_DATABASE];
        if (!provider) return null;

        // Budget compatibility score (0-100)
        let budgetScore = 100;
        if (provider.budgetRange.max > 0) {
          if (budget_max < provider.budgetRange.min) {
            budgetScore = Math.max(0, 50 - ((provider.budgetRange.min - budget_max) / provider.budgetRange.min * 50));
          } else if (budget_max >= provider.budgetRange.max) {
            budgetScore = 100;
          } else {
            budgetScore = 70 + ((budget_max - provider.budgetRange.min) / (provider.budgetRange.max - provider.budgetRange.min) * 30);
          }
        }

        // Location match (simplified - in production would use geocoding)
        const locationMatch = location === "any" || location === "" ? true : true; // Always match for now
        const locationScore = locationMatch ? 100 : 50;

        // Urgency alignment score
        let urgencyScore = 80;
        const urgencyMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
        const providerUrgency = urgencyMap[provider.urgencyLevel] || 1;
        const requestedUrgency = urgencyMap[urgency] || 1;
        
        if (providerUrgency >= requestedUrgency) {
          urgencyScore = 100;
        } else {
          urgencyScore = 60;
        }

        const overallScore = Math.round((budgetScore * 0.4) + (locationScore * 0.3) + (urgencyScore * 0.3));

        return {
          providerKey,
          ...provider,
          budgetScore: Math.round(budgetScore),
          locationScore: Math.round(locationScore),
          urgencyScore: Math.round(urgencyScore),
          overallScore,
          withinBudget: budget_max >= provider.budgetRange.min,
          estimatedCost: `$${provider.budgetRange.min} - $${provider.budgetRange.max}`
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.overallScore || 0) - (a?.overallScore || 0));

    const topMatch = matches[0];
    const alternativeMatches = matches.slice(1, 3);

    console.log(`[match-provider] [SUCCESS] Found ${matches.length} matches. Top: ${topMatch?.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        topMatch,
        alternatives: alternativeMatches,
        searchCriteria: {
          symptom_type,
          budget_max,
          location,
          urgency
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[match-provider] [ERROR]', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
