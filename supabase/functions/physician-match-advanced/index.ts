import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  suggestedSpecialties: string[];
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  preferences?: {
    location?: string;
    insurance?: string;
    costPreference?: 'low' | 'medium' | 'high' | 'any';
    telehealth?: boolean;
    maxDistance?: number;
  };
  limit?: number;
}

interface PhysicianMatch {
  id: string;
  name: string;
  specialty: string;
  subSpecialty?: string;
  location: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  rating: number;
  costTier: string;
  availability: string;
  availabilitySchedule?: Array<{ day: string; start: string; end: string }>;
  insuranceAccepted: string[];
  telehealthAvailable: boolean;
  yearsExperience: number;
  matchScore: number;
  matchReasons: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { suggestedSpecialties, urgency, preferences, limit = 5 } = await req.json() as MatchRequest;

    console.log(`Finding physicians for specialties: ${suggestedSpecialties.join(', ')}, urgency: ${urgency}`);

    // Map urgency to availability requirements
    const availabilityMap: Record<string, string[]> = {
      'emergency': ['immediate'],
      'urgent': ['immediate', 'same_day'],
      'soon': ['immediate', 'same_day', 'next_day'],
      'routine': ['immediate', 'same_day', 'next_day', 'within_week', 'within_month']
    };

    const requiredAvailability = availabilityMap[urgency] || availabilityMap['routine'];

    // Build query to get matching physicians
    let query = supabase
      .from('physicians')
      .select('*')
      .eq('accepting_new_patients', true)
      .in('availability', requiredAvailability);

    // Filter by cost if specified
    if (preferences?.costPreference && preferences.costPreference !== 'any') {
      const costMap: Record<string, string[]> = {
        'low': ['low'],
        'medium': ['low', 'medium'],
        'high': ['low', 'medium', 'high']
      };
      query = query.in('cost_tier', costMap[preferences.costPreference] || ['low', 'medium', 'high', 'premium']);
    }

    // Filter by telehealth if required
    if (preferences?.telehealth) {
      query = query.eq('telehealth_available', true);
    }

    // Filter by city/location if specified
    if (preferences?.location) {
      query = query.or(`city.ilike.%${preferences.location}%,state.ilike.%${preferences.location}%,location.ilike.%${preferences.location}%`);
    }

    const { data: physicians, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw new Error('Failed to query physicians database');
    }

    if (!physicians || physicians.length === 0) {
      console.log('No physicians found matching criteria, returning all accepting patients');
      // Fallback: get any available physicians
      const { data: fallbackPhysicians } = await supabase
        .from('physicians')
        .select('*')
        .eq('accepting_new_patients', true)
        .limit(limit);
      
      if (!fallbackPhysicians || fallbackPhysicians.length === 0) {
        return new Response(JSON.stringify({ 
          matches: [],
          message: 'No physicians currently available' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Score fallback physicians
      const scoredFallback = fallbackPhysicians.map(p => scorePhysician(p, suggestedSpecialties, urgency, preferences));
      scoredFallback.sort((a, b) => b.matchScore - a.matchScore);
      
      return new Response(JSON.stringify({ matches: scoredFallback.slice(0, limit) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Score and rank physicians
    const scoredPhysicians: PhysicianMatch[] = physicians.map(p => 
      scorePhysician(p, suggestedSpecialties, urgency, preferences)
    );

    // Sort by match score (highest first)
    scoredPhysicians.sort((a, b) => b.matchScore - a.matchScore);

    const topMatches = scoredPhysicians.slice(0, limit);

    console.log(`Returning ${topMatches.length} physician matches`);

    return new Response(JSON.stringify({ matches: topMatches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in physician-match-advanced:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to match physicians';
    return new Response(
      JSON.stringify({ error: errorMessage, matches: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function scorePhysician(
  physician: any,
  suggestedSpecialties: string[],
  urgency: string,
  preferences?: MatchRequest['preferences']
): PhysicianMatch {
  let score = 0;
  const matchReasons: string[] = [];

  // Specialty match (0-40 points)
  const specialtyLower = physician.specialty?.toLowerCase() || '';
  const subSpecialtyLower = physician.sub_specialty?.toLowerCase() || '';
  
  for (const specialty of suggestedSpecialties) {
    const specLower = specialty.toLowerCase();
    if (specialtyLower.includes(specLower) || specLower.includes(specialtyLower)) {
      score += 40;
      matchReasons.push(`Specializes in ${physician.specialty}`);
      break;
    } else if (subSpecialtyLower.includes(specLower) || specLower.includes(subSpecialtyLower)) {
      score += 35;
      matchReasons.push(`Sub-specialty in ${physician.sub_specialty}`);
      break;
    }
  }

  // General/Primary care is a fallback for many conditions
  if (score === 0 && (specialtyLower.includes('internal medicine') || 
      specialtyLower.includes('family medicine') || 
      specialtyLower.includes('general'))) {
    score += 20;
    matchReasons.push('General practitioner available');
  }

  // Availability match based on urgency (0-25 points)
  const availabilityScore: Record<string, Record<string, number>> = {
    'emergency': { 'immediate': 25, 'same_day': 15, 'next_day': 5 },
    'urgent': { 'immediate': 25, 'same_day': 22, 'next_day': 15, 'within_week': 5 },
    'soon': { 'immediate': 20, 'same_day': 22, 'next_day': 25, 'within_week': 18 },
    'routine': { 'immediate': 15, 'same_day': 18, 'next_day': 20, 'within_week': 25, 'within_month': 22 }
  };

  const availScore = availabilityScore[urgency]?.[physician.availability] || 0;
  score += availScore;
  if (availScore > 15) {
    matchReasons.push(`Available ${physician.availability?.replace('_', ' ')}`);
  }

  // Rating bonus (0-15 points)
  const rating = parseFloat(physician.rating) || 0;
  const ratingScore = Math.round((rating / 5) * 15);
  score += ratingScore;
  if (rating >= 4.5) {
    matchReasons.push(`Highly rated (${rating}★)`);
  }

  // Experience bonus (0-10 points)
  const experience = physician.years_experience || 0;
  const expScore = Math.min(10, Math.round(experience / 3));
  score += expScore;
  if (experience >= 15) {
    matchReasons.push(`${experience}+ years experience`);
  }

  // Insurance match (0-10 points)
  if (preferences?.insurance && physician.insurance_accepted) {
    const insurances = physician.insurance_accepted as string[];
    if (insurances.some(ins => 
      ins.toLowerCase().includes(preferences.insurance!.toLowerCase()) ||
      ins.toLowerCase().includes('all major')
    )) {
      score += 10;
      matchReasons.push('Accepts your insurance');
    }
  }

  // Telehealth bonus if preferred
  if (preferences?.telehealth && physician.telehealth_available) {
    score += 5;
    matchReasons.push('Telehealth available');
  }

  return {
    id: physician.id,
    name: physician.name,
    specialty: physician.specialty,
    subSpecialty: physician.sub_specialty,
    location: physician.location,
    city: physician.city,
    state: physician.state,
    phone: physician.phone || undefined,
    email: physician.email || undefined,
    rating: rating,
    costTier: physician.cost_tier,
    availability: physician.availability,
    availabilitySchedule: physician.availability_schedule || undefined,
    insuranceAccepted: physician.insurance_accepted || [],
    telehealthAvailable: physician.telehealth_available || false,
    yearsExperience: experience,
    matchScore: Math.min(100, score),
    matchReasons: matchReasons.length > 0 ? matchReasons : ['Available provider']
  };
}
