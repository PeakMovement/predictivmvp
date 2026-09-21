import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TreatmentPlanRequest {
  symptoms: string;
  severity: {
    level: string;
    score: number;
  };
  selectedPhysician: {
    name: string;
    specialty: string;
    location: string;
  };
  extractedSymptoms?: Array<{
    symptom: string;
    bodyArea?: string;
  }>;
}

interface TreatmentPlanResponse {
  summary: string;
  immediateSteps: string[];
  beforeAppointment: string[];
  questionsForDoctor: string[];
  lifestyleRecommendations: string[];
  warningSignsToWatch: string[];
  estimatedRecovery?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { symptoms, severity, selectedPhysician, extractedSymptoms } = await req.json() as TreatmentPlanRequest;


    const symptomsDetail = extractedSymptoms?.map(s => 
      `${s.symptom}${s.bodyArea ? ` (${s.bodyArea})` : ''}`
    ).join(', ') || symptoms;

    const systemPrompt = `You are a helpful medical assistant providing guidance for patients preparing for their healthcare appointments. You are NOT providing medical diagnosis or treatment - only helping patients prepare for their doctor visit.

Your role is to:
1. Summarize the patient's situation clearly
2. Suggest immediate comfort measures (NOT treatments)
3. Help them prepare for their appointment
4. Suggest questions they might want to ask
5. Recommend general wellness practices
6. Identify warning signs that would require immediate medical attention

IMPORTANT DISCLAIMERS:
- Always remind patients this is not a diagnosis
- Always defer to their healthcare provider's expertise
- Emphasize the importance of the scheduled appointment
- For any concerning symptoms, recommend seeking immediate care

Respond ONLY with valid JSON matching this structure:
{
  "summary": "Brief, empathetic summary of the patient's situation",
  "immediateSteps": ["Array of immediate comfort/care steps"],
  "beforeAppointment": ["Things to prepare before seeing the doctor"],
  "questionsForDoctor": ["Suggested questions to ask the physician"],
  "lifestyleRecommendations": ["General wellness suggestions"],
  "warningSignsToWatch": ["Symptoms that would require immediate medical attention"],
  "estimatedRecovery": "General timeline expectation (optional)"
}`;

    const userPrompt = `Create a preparation guide for a patient with the following:

Symptoms: ${symptomsDetail}
Severity Level: ${severity.level} (${severity.score}/10)
Scheduled Appointment: ${selectedPhysician.name}, ${selectedPhysician.specialty} at ${selectedPhysician.location}

Please provide helpful, empathetic guidance to help them prepare for their appointment.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI model');
    }

    const treatmentPlan: TreatmentPlanResponse = JSON.parse(content);


    return new Response(JSON.stringify(treatmentPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-treatment-plan:', error);
    
    // Return a helpful fallback plan
    const fallbackPlan: TreatmentPlanResponse = {
      summary: "We've scheduled your appointment with a healthcare provider who can properly evaluate your symptoms.",
      immediateSteps: [
        "Rest and stay hydrated",
        "Monitor your symptoms and note any changes",
        "Avoid strenuous activity until evaluated"
      ],
      beforeAppointment: [
        "Write down all your symptoms and when they started",
        "List any medications you're currently taking",
        "Note any allergies or medical conditions",
        "Prepare your insurance information"
      ],
      questionsForDoctor: [
        "What might be causing these symptoms?",
        "What tests or examinations do you recommend?",
        "What treatment options are available?",
        "When should I expect to feel better?"
      ],
      lifestyleRecommendations: [
        "Get adequate sleep",
        "Stay hydrated with water",
        "Eat nutritious meals",
        "Manage stress levels"
      ],
      warningSignsToWatch: [
        "Severe or worsening pain",
        "High fever (over 103°F)",
        "Difficulty breathing",
        "Signs of allergic reaction"
      ]
    };

    return new Response(JSON.stringify(fallbackPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
