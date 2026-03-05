import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SymptomAnalysisRequest {
  symptoms: string;
  additionalContext?: {
    duration?: string;
    severity?: string;
    triggers?: string[];
    medications?: string[];
    medicalHistory?: string[];
  };
}

interface SymptomAnalysisResponse {
  extractedSymptoms: Array<{
    symptom: string;
    bodyArea?: string;
    duration?: string;
  }>;
  severity: {
    level: 'mild' | 'moderate' | 'severe' | 'critical';
    score: number; // 1-10
    confidence: number; // 0-1
  };
  urgency: {
    level: 'routine' | 'soon' | 'urgent' | 'emergency';
    reasoning: string;
  };
  isEmergency: boolean;
  emergencyFlags: string[];
  suggestedSpecialties: string[];
  followUpQuestions?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { symptoms, additionalContext } = await req.json() as SymptomAnalysisRequest;

    if (!symptoms || typeof symptoms !== 'string') {
      throw new Error('Symptoms description is required');
    }

    console.log(`Analyzing symptoms: ${symptoms.substring(0, 100)}...`);

    // Build context string
    let contextString = '';
    if (additionalContext) {
      if (additionalContext.duration) contextString += `Duration: ${additionalContext.duration}. `;
      if (additionalContext.severity) contextString += `User-reported severity: ${additionalContext.severity}. `;
      if (additionalContext.triggers?.length) contextString += `Triggers: ${additionalContext.triggers.join(', ')}. `;
      if (additionalContext.medications?.length) contextString += `Current medications: ${additionalContext.medications.join(', ')}. `;
      if (additionalContext.medicalHistory?.length) contextString += `Medical history: ${additionalContext.medicalHistory.join(', ')}. `;
    }

    const systemPrompt = `You are a medical symptom analysis AI assistant. Your role is to:
1. Extract and structure symptoms from natural language descriptions
2. Assess severity and urgency levels
3. Identify potential emergency situations requiring immediate care
4. Suggest appropriate medical specialties

CRITICAL EMERGENCY DETECTION:
Always flag as emergency (isEmergency: true) for:
- Chest pain, especially with shortness of breath, arm pain, or jaw pain
- Difficulty breathing or severe shortness of breath
- Signs of stroke (sudden numbness, confusion, vision problems, severe headache)
- Severe bleeding that won't stop
- Loss of consciousness
- Severe allergic reactions (anaphylaxis)
- Suicidal thoughts or self-harm
- Severe abdominal pain with fever
- Head injury with confusion or loss of consciousness

SEVERITY SCORING (1-10):
1-3: Mild - Minor discomfort, self-care appropriate
4-5: Moderate - Should see doctor within a few days
6-7: Moderate-High - Should see doctor soon (1-2 days)
8-9: Severe - Urgent care needed same day
10: Critical - Emergency room immediately

Respond ONLY with valid JSON matching this exact structure:
{
  "extractedSymptoms": [{"symptom": "string", "bodyArea": "string", "duration": "string"}],
  "severity": {"level": "mild|moderate|severe|critical", "score": number, "confidence": number},
  "urgency": {"level": "routine|soon|urgent|emergency", "reasoning": "string"},
  "isEmergency": boolean,
  "emergencyFlags": ["string"],
  "suggestedSpecialties": ["string"],
  "followUpQuestions": ["string"]
}`;

    const userPrompt = `Analyze these symptoms and provide a structured assessment:

Patient's description: "${symptoms}"
${contextString ? `\nAdditional context: ${contextString}` : ''}

Provide your analysis as JSON.`;

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
        temperature: 0.3,
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

    const analysis: SymptomAnalysisResponse = JSON.parse(content);

    console.log(`Analysis complete - Severity: ${analysis.severity.level}, Emergency: ${analysis.isEmergency}`);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in symptom-analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze symptoms';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        extractedSymptoms: [],
        severity: { level: 'moderate', score: 5, confidence: 0.3 },
        urgency: { level: 'soon', reasoning: 'Unable to fully analyze - please consult a healthcare provider' },
        isEmergency: false,
        emergencyFlags: [],
        suggestedSpecialties: ['General Practice', 'Internal Medicine']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 with fallback data instead of error
      }
    );
  }
});
