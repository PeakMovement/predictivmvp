import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample physician data with complete contact info and availability
const physicianData = [
  {
    name: "Dr. Emily Carter",
    specialty: "Cardiology",
    sub_specialty: "Preventive Cardiology",
    phone: "+1-555-123-4567",
    email: "emily.carter@heartcare.com",
    location: "New York, NY",
    address: "123 Heart Health Blvd, Suite 400",
    city: "New York",
    state: "NY",
    zip_code: "10001",
    availability: "weekdays",
    cost_tier: "premium",
    rating: 4.9,
    years_experience: 15,
    telehealth_available: true,
    accepting_new_patients: true,
    verified: true,
    languages: ["English", "Spanish"],
    insurance_accepted: ["Blue Cross", "Aetna", "United Healthcare", "Cigna"],
    education: "Harvard Medical School",
    hospital_affiliations: ["NYU Langone", "Mount Sinai"]
  },
  {
    name: "Dr. Liam Johnson",
    specialty: "Dermatology",
    sub_specialty: "Cosmetic Dermatology",
    phone: "+1-555-234-5678",
    email: "liam.johnson@skinwell.com",
    location: "Los Angeles, CA",
    address: "456 Skin Care Ave, Floor 2",
    city: "Los Angeles",
    state: "CA",
    zip_code: "90001",
    availability: "next_week",
    cost_tier: "standard",
    rating: 4.7,
    years_experience: 10,
    telehealth_available: true,
    accepting_new_patients: true,
    verified: true,
    languages: ["English"],
    insurance_accepted: ["Kaiser", "Blue Shield", "Anthem"],
    education: "UCLA Medical School",
    hospital_affiliations: ["Cedars-Sinai"]
  },
  {
    name: "Dr. Sarah Mitchell",
    specialty: "Internal Medicine",
    sub_specialty: "Primary Care",
    phone: "+1-555-345-6789",
    email: "sarah.mitchell@primarymd.com",
    location: "Chicago, IL",
    address: "789 Wellness Way, Suite 100",
    city: "Chicago",
    state: "IL",
    zip_code: "60601",
    availability: "immediate",
    cost_tier: "budget",
    rating: 4.8,
    years_experience: 12,
    telehealth_available: true,
    accepting_new_patients: true,
    verified: true,
    languages: ["English", "Polish"],
    insurance_accepted: ["Medicaid", "Medicare", "Blue Cross", "Humana"],
    education: "Northwestern University",
    hospital_affiliations: ["Northwestern Memorial"]
  },
  {
    name: "Dr. Marcus Chen",
    specialty: "Orthopedics",
    sub_specialty: "Sports Medicine",
    phone: "+1-555-456-7890",
    email: "marcus.chen@sportsdoc.com",
    location: "Boston, MA",
    address: "321 Athletic Center Dr",
    city: "Boston",
    state: "MA",
    zip_code: "02101",
    availability: "weekdays",
    cost_tier: "premium",
    rating: 4.9,
    years_experience: 18,
    telehealth_available: false,
    accepting_new_patients: true,
    verified: true,
    languages: ["English", "Mandarin"],
    insurance_accepted: ["Blue Cross", "Harvard Pilgrim", "Tufts"],
    education: "Johns Hopkins University",
    hospital_affiliations: ["Mass General", "Brigham and Women's"]
  },
  {
    name: "Dr. Jessica Williams",
    specialty: "Psychiatry",
    sub_specialty: "Anxiety and Depression",
    phone: "+1-555-567-8901",
    email: "jessica.williams@mindcare.com",
    location: "Seattle, WA",
    address: "555 Mental Wellness St, Suite 300",
    city: "Seattle",
    state: "WA",
    zip_code: "98101",
    availability: "immediate",
    cost_tier: "standard",
    rating: 4.8,
    years_experience: 8,
    telehealth_available: true,
    accepting_new_patients: true,
    verified: true,
    languages: ["English"],
    insurance_accepted: ["Premera", "Regence", "Kaiser", "United Healthcare"],
    education: "Stanford University",
    hospital_affiliations: ["Swedish Medical Center"]
  },
  {
    name: "Dr. Robert Kim",
    specialty: "Neurology",
    sub_specialty: "Headache and Migraine",
    phone: "+1-555-678-9012",
    email: "robert.kim@neurocare.com",
    location: "San Francisco, CA",
    address: "888 Brain Health Blvd",
    city: "San Francisco",
    state: "CA",
    zip_code: "94102",
    availability: "next_week",
    cost_tier: "premium",
    rating: 4.7,
    years_experience: 20,
    telehealth_available: true,
    accepting_new_patients: false,
    verified: true,
    languages: ["English", "Korean"],
    insurance_accepted: ["Blue Shield", "Aetna", "Cigna"],
    education: "UCSF Medical School",
    hospital_affiliations: ["UCSF Medical Center"]
  },
  {
    name: "Dr. Amanda Torres",
    specialty: "Gastroenterology",
    sub_specialty: "Digestive Health",
    phone: "+1-555-789-0123",
    email: "amanda.torres@digestivecare.com",
    location: "Miami, FL",
    address: "999 GI Health Way",
    city: "Miami",
    state: "FL",
    zip_code: "33101",
    availability: "weekdays",
    cost_tier: "standard",
    rating: 4.6,
    years_experience: 14,
    telehealth_available: true,
    accepting_new_patients: true,
    verified: true,
    languages: ["English", "Spanish", "Portuguese"],
    insurance_accepted: ["Florida Blue", "Aetna", "United Healthcare", "Humana"],
    education: "University of Miami",
    hospital_affiliations: ["Jackson Memorial"]
  },
  {
    name: "Dr. David Park",
    specialty: "Pulmonology",
    sub_specialty: "Sleep Medicine",
    phone: "+1-555-890-1234",
    email: "david.park@breathewell.com",
    location: "Denver, CO",
    address: "444 Lung Health Dr, Suite 200",
    city: "Denver",
    state: "CO",
    zip_code: "80201",
    availability: "immediate",
    cost_tier: "budget",
    rating: 4.8,
    years_experience: 11,
    telehealth_available: true,
    accepting_new_patients: true,
    verified: true,
    languages: ["English"],
    insurance_accepted: ["Kaiser", "Cigna", "Anthem", "Medicare"],
    education: "University of Colorado",
    hospital_affiliations: ["UCHealth"]
  }
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting physician data seed...");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clear existing data and insert fresh (optional - can be removed for append-only)
    const { data: existingPhysicians } = await supabase
      .from('physicians')
      .select('id');

    console.log(`Found ${existingPhysicians?.length || 0} existing physicians`);

    // Upsert physicians based on name + specialty to avoid duplicates
    const results = [];
    for (const physician of physicianData) {
      const { data, error } = await supabase
        .from('physicians')
        .upsert(physician, { 
          onConflict: 'name,specialty',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`Error upserting ${physician.name}:`, error);
        results.push({ name: physician.name, status: 'error', error: error.message });
      } else {
        console.log(`Successfully upserted ${physician.name}`);
        results.push({ name: physician.name, status: 'success', data });
      }
    }

    // Fetch final count
    const { count } = await supabase
      .from('physicians')
      .select('*', { count: 'exact', head: true });

    console.log(`Seed complete. Total physicians: ${count}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${physicianData.length} physicians`,
        totalPhysicians: count,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Seed error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
