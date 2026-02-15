import { TreatmentPlan, ServiceCategory, TreatmentPlanService } from '@/types/treatmentPlans';
import { supabase } from '@/integrations/supabase/client';

const SERVICE_COSTS: Record<ServiceCategory, { min: number; max: number }> = {
  'doctor': { min: 500, max: 1000 },
  'specialist': { min: 1000, max: 2500 },
  'physiotherapy': { min: 400, max: 800 },
  'dietitian': { min: 500, max: 900 },
  'psychologist': { min: 800, max: 1500 },
  'chiropractor': { min: 400, max: 700 },
  'biokineticist': { min: 400, max: 700 },
  'personal-trainer': { min: 300, max: 600 },
  'massage-therapist': { min: 300, max: 600 },
  'occupational-therapist': { min: 500, max: 900 },
};

const SYMPTOM_TO_SERVICES: Record<string, ServiceCategory[]> = {
  'pain': ['physiotherapy', 'chiropractor', 'doctor'],
  'back': ['physiotherapy', 'chiropractor', 'doctor'],
  'neck': ['physiotherapy', 'chiropractor', 'doctor'],
  'joint': ['physiotherapy', 'doctor', 'specialist'],
  'muscle': ['physiotherapy', 'massage-therapist', 'biokineticist'],
  'injury': ['doctor', 'physiotherapy', 'biokineticist'],
  'stress': ['psychologist', 'massage-therapist'],
  'anxiety': ['psychologist', 'doctor'],
  'depression': ['psychologist', 'doctor'],
  'weight': ['dietitian', 'personal-trainer', 'doctor'],
  'diet': ['dietitian', 'doctor'],
  'nutrition': ['dietitian'],
  'fitness': ['personal-trainer', 'biokineticist'],
  'headache': ['doctor', 'chiropractor', 'physiotherapy'],
  'migraine': ['doctor', 'specialist'],
  'fatigue': ['doctor', 'dietitian'],
};

function analyzeUserInput(input: string): {
  detectedServices: ServiceCategory[];
  symptoms: string[];
  isUrgent: boolean;
  budget?: number;
  location?: string;
} {
  const lowerInput = input.toLowerCase();
  const detectedServices = new Set<ServiceCategory>();
  const symptoms: string[] = [];

  Object.entries(SYMPTOM_TO_SERVICES).forEach(([symptom, services]) => {
    if (lowerInput.includes(symptom)) {
      symptoms.push(symptom);
      services.forEach(service => detectedServices.add(service));
    }
  });

  if (detectedServices.size === 0) {
    detectedServices.add('doctor');
  }

  const budgetMatch = lowerInput.match(/r?\s*(\d+)/);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) : undefined;

  const locationMatch = lowerInput.match(/(johannesburg|cape town|durban|pretoria|port elizabeth)/i);
  const location = locationMatch ? locationMatch[1] : undefined;

  const isUrgent = lowerInput.includes('urgent') || lowerInput.includes('emergency') || lowerInput.includes('severe');

  return {
    detectedServices: Array.from(detectedServices).slice(0, 3),
    symptoms,
    isUrgent,
    budget,
    location,
  };
}

function generatePlanName(services: ServiceCategory[], budget?: number): string {
  if (services.length === 1) {
    return `Focused ${services[0]} Plan`;
  }

  if (budget && budget < 2000) {
    return 'Budget-Friendly Care Plan';
  }

  if (services.includes('doctor') && services.includes('physiotherapy')) {
    return 'Comprehensive Recovery Plan';
  }

  return 'Personalized Health Plan';
}

function generatePlanDescription(services: ServiceCategory[], symptoms: string[]): string {
  if (symptoms.length > 0) {
    return `A personalized treatment plan addressing ${symptoms.join(', ')} with ${services.length} specialized services.`;
  }
  return `A comprehensive health plan with ${services.length} coordinated services to address your health needs.`;
}

function createService(
  category: ServiceCategory,
  budget?: number
): TreatmentPlanService {
  const costs = SERVICE_COSTS[category];
  const basePrice = budget && budget < 3000 ? costs.min : Math.floor((costs.min + costs.max) / 2);

  const descriptions: Record<ServiceCategory, string> = {
    'doctor': 'Initial assessment and diagnosis with a qualified general practitioner',
    'specialist': 'Specialized medical consultation for targeted treatment',
    'physiotherapy': 'Physical therapy sessions for rehabilitation and pain management',
    'dietitian': 'Personalized nutrition counseling and meal planning',
    'psychologist': 'Professional mental health support and therapy',
    'chiropractor': 'Spinal manipulation and musculoskeletal care',
    'biokineticist': 'Exercise-based rehabilitation and movement therapy',
    'personal-trainer': 'Personalized fitness training and exercise programming',
    'massage-therapist': 'Therapeutic massage for pain relief and relaxation',
    'occupational-therapist': 'Daily living skills training and adaptive strategies',
  };

  return {
    type: category,
    price: basePrice,
    sessions: category === 'doctor' ? 1 : category === 'specialist' ? 1 : 4,
    description: descriptions[category],
    frequency: category === 'doctor' || category === 'specialist' ? 'Once' : '2x per week',
    evidenceLevel: 'high',
  };
}

export async function generateTreatmentPlans(userInput: string): Promise<TreatmentPlan[]> {
  const analysis = analyzeUserInput(userInput);
  const plans: TreatmentPlan[] = [];

  const bestFitServices = analysis.detectedServices.map(service =>
    createService(service, analysis.budget)
  );

  const bestFitPlan: TreatmentPlan = {
    id: crypto.randomUUID(),
    name: generatePlanName(analysis.detectedServices, analysis.budget),
    description: generatePlanDescription(analysis.detectedServices, analysis.symptoms),
    services: bestFitServices,
    totalCost: bestFitServices.reduce((sum, s) => sum + (s.price * s.sessions), 0),
    planType: 'best-fit',
    timeFrame: '4-6 weeks',
    complexityScore: analysis.detectedServices.length / 5,
    matchScore: 0.85,
    analyzedSymptoms: analysis.symptoms,
  };

  plans.push(bestFitPlan);

  if (analysis.budget && analysis.budget < bestFitPlan.totalCost) {
    const budgetServices = analysis.detectedServices.slice(0, 2).map(service =>
      createService(service, analysis.budget)
    );

    plans.push({
      id: crypto.randomUUID(),
      name: 'Budget-Conscious Plan',
      description: 'An affordable approach focusing on essential services',
      services: budgetServices,
      totalCost: budgetServices.reduce((sum, s) => sum + (s.price * s.sessions), 0),
      planType: 'budget-conscious',
      timeFrame: '6-8 weeks',
      complexityScore: budgetServices.length / 5,
      matchScore: 0.75,
      analyzedSymptoms: analysis.symptoms,
    });
  }

  if (analysis.detectedServices.length > 2) {
    const progressiveServices = [
      createService(analysis.detectedServices[0], analysis.budget),
    ];

    plans.push({
      id: crypto.randomUUID(),
      name: 'Progressive Care Plan',
      description: 'Start with essential care and expand as needed',
      services: progressiveServices,
      totalCost: progressiveServices.reduce((sum, s) => sum + (s.price * s.sessions), 0),
      planType: 'progressive',
      timeFrame: '2-3 weeks initial',
      complexityScore: 0.4,
      matchScore: 0.8,
      analyzedSymptoms: analysis.symptoms,
    });
  }

  return plans;
}

export async function saveTreatmentPlan(plan: TreatmentPlan, userId: string, userInput: string) {
  const { data: savedPlan, error: planError } = await supabase
    .from('treatment_plans')
    .insert({
      user_id: userId,
      name: plan.name,
      description: plan.description,
      plan_type: plan.planType,
      total_cost: plan.totalCost,
      time_frame: plan.timeFrame,
      complexity_score: plan.complexityScore,
      match_score: plan.matchScore,
      analyzed_symptoms: plan.analyzedSymptoms,
      goal: plan.goal,
      user_input: userInput,
    })
    .select()
    .single();

  if (planError) throw planError;

  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, name');

  const categoryMap = new Map(categories?.map(c => [c.name, c.id]) || []);

  const servicesData = plan.services.map((service, index) => ({
    treatment_plan_id: savedPlan.id,
    service_category_id: categoryMap.get(service.type),
    sessions: service.sessions,
    price_per_session: service.price,
    frequency: service.frequency,
    description: service.description,
    rationale: service.rationale,
    evidence_level: service.evidenceLevel,
    display_order: index,
  }));

  const { error: servicesError } = await supabase
    .from('treatment_plan_services')
    .insert(servicesData);

  if (servicesError) throw servicesError;

  return savedPlan;
}

export async function getUserTreatmentPlans(userId: string) {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select(`
      *,
      treatment_plan_services (
        *,
        service_categories (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
