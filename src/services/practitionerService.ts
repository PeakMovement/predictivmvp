// @ts-nocheck - Tables not yet in generated types
import { HealthcarePractitioner, ServiceCategory } from '@/types/treatmentPlans';
import { supabase } from '@/integrations/supabase/client';

export async function searchPractitioners(params: {
  serviceCategories?: ServiceCategory[];
  location?: string;
  onlineOnly?: boolean;
  maxFee?: number;
}): Promise<HealthcarePractitioner[]> {
  let query = supabase
    .from('healthcare_practitioners')
    .select(`
      *,
      practitioner_specialties (
        service_categories (*)
      )
    `);

  if (params.location) {
    query = query.or(`city.ilike.%${params.location}%,location.ilike.%${params.location}%`);
  }

  if (params.onlineOnly) {
    query = query.eq('online_available', true);
  }

  if (params.maxFee) {
    query = query.lte('consultation_fee', params.maxFee);
  }

  const { data, error } = await query;

  if (error) throw error;

  let practitioners = data || [];

  if (params.serviceCategories && params.serviceCategories.length > 0) {
    practitioners = practitioners.filter(p =>
      p.practitioner_specialties?.some((ps: any) =>
        params.serviceCategories?.includes(ps.service_categories?.name)
      )
    );
  }

  return practitioners.map(mapPractitioner);
}

export async function getPractitionerById(id: string): Promise<HealthcarePractitioner | null> {
  const { data, error } = await supabase
    .from('healthcare_practitioners')
    .select(`
      *,
      practitioner_specialties (
        service_categories (*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  return mapPractitioner(data);
}

function mapPractitioner(data: any): HealthcarePractitioner {
  return {
    id: data.id,
    fullName: data.full_name,
    title: data.title,
    specialty: data.specialty,
    location: data.location,
    city: data.city,
    province: data.province,
    onlineAvailable: data.online_available,
    rating: data.rating,
    yearsExperience: data.years_experience,
    qualifications: data.qualifications || [],
    languages: data.languages || [],
    bio: data.bio,
    consultationFee: data.consultation_fee,
    acceptsMedicalAid: data.accepts_medical_aid,
    availableTimes: data.available_times,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    profileImageUrl: data.profile_image_url,
    specialties: data.practitioner_specialties?.map((ps: any) => ps.service_categories?.name) || [],
  };
}

export const MOCK_PRACTITIONERS: HealthcarePractitioner[] = [
  {
    id: '1',
    fullName: 'Dr. Sarah Johnson',
    title: 'General Practitioner',
    specialty: 'Family Medicine',
    location: 'Sandton, Johannesburg',
    city: 'Johannesburg',
    province: 'Gauteng',
    onlineAvailable: true,
    rating: 4.8,
    yearsExperience: 12,
    qualifications: ['MBChB', 'FCFam(SA)'],
    languages: ['English', 'Afrikaans'],
    bio: 'Experienced GP with focus on preventative care',
    consultationFee: 750,
    acceptsMedicalAid: true,
    specialties: ['doctor'],
    calendlyUrl: 'https://calendly.com/example',
  },
  {
    id: '2',
    fullName: 'Michael Thompson',
    title: 'Physiotherapist',
    specialty: 'Sports Rehabilitation',
    location: 'Green Point, Cape Town',
    city: 'Cape Town',
    province: 'Western Cape',
    onlineAvailable: false,
    rating: 4.9,
    yearsExperience: 8,
    qualifications: ['BSc Physiotherapy', 'MSc Sports Medicine'],
    languages: ['English'],
    bio: 'Specialized in sports injuries and rehabilitation',
    consultationFee: 650,
    acceptsMedicalAid: true,
    specialties: ['physiotherapy'],
  },
  {
    id: '3',
    fullName: 'Dr. Priya Naidoo',
    title: 'Clinical Psychologist',
    specialty: 'Anxiety & Depression',
    location: 'Umhlanga, Durban',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    onlineAvailable: true,
    rating: 4.7,
    yearsExperience: 15,
    qualifications: ['MA Clinical Psychology', 'PhD'],
    languages: ['English', 'Zulu'],
    bio: 'Compassionate care for mental health challenges',
    consultationFee: 1200,
    acceptsMedicalAid: true,
    specialties: ['psychologist'],
    calendlyUrl: 'https://calendly.com/example',
  },
  {
    id: '4',
    fullName: 'Jennifer van der Merwe',
    title: 'Registered Dietitian',
    specialty: 'Sports Nutrition',
    location: 'Centurion, Pretoria',
    city: 'Pretoria',
    province: 'Gauteng',
    onlineAvailable: true,
    rating: 4.6,
    yearsExperience: 10,
    qualifications: ['BSc Dietetics', 'HPCSA Registered'],
    languages: ['Afrikaans', 'English'],
    bio: 'Expert in weight management and sports nutrition',
    consultationFee: 800,
    acceptsMedicalAid: true,
    specialties: ['dietitian'],
  },
  {
    id: '5',
    fullName: 'Dr. James Botha',
    title: 'Chiropractor',
    specialty: 'Spinal Care',
    location: 'Stellenbosch',
    city: 'Stellenbosch',
    province: 'Western Cape',
    onlineAvailable: false,
    rating: 4.8,
    yearsExperience: 20,
    qualifications: ['DC', 'MSc Chiropractic'],
    languages: ['Afrikaans', 'English'],
    bio: 'Specialist in back and neck pain management',
    consultationFee: 550,
    acceptsMedicalAid: true,
    specialties: ['chiropractor'],
  },
];

export async function seedMockPractitioners() {
  const { data: existingCount } = await supabase
    .from('healthcare_practitioners')
    .select('id', { count: 'exact', head: true });

  if (existingCount && existingCount > 0) {
    console.log('Practitioners already seeded');
    return;
  }

  for (const practitioner of MOCK_PRACTITIONERS) {
    const { data, error } = await supabase
      .from('healthcare_practitioners')
      .insert({
        full_name: practitioner.fullName,
        title: practitioner.title,
        specialty: practitioner.specialty,
        location: practitioner.location,
        city: practitioner.city,
        province: practitioner.province,
        online_available: practitioner.onlineAvailable,
        rating: practitioner.rating,
        years_experience: practitioner.yearsExperience,
        qualifications: practitioner.qualifications,
        languages: practitioner.languages,
        bio: practitioner.bio,
        consultation_fee: practitioner.consultationFee,
        accepts_medical_aid: practitioner.acceptsMedicalAid,
      })
      .select()
      .single();

    if (error) {
      console.error('Error seeding practitioner:', error);
      continue;
    }

    if (data && practitioner.specialties) {
      const { data: categories } = await supabase
        .from('service_categories')
        .select('id, name')
        .in('name', practitioner.specialties);

      if (categories) {
        const specialtiesData = categories.map(cat => ({
          practitioner_id: data.id,
          service_category_id: cat.id,
          proficiency_level: 'expert' as const,
        }));

        await supabase
          .from('practitioner_specialties')
          .insert(specialtiesData);
      }
    }
  }

  console.log('Mock practitioners seeded successfully');
}
