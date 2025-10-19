import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { documentId, userId, documentType, fileContent } = await req.json();

    console.log(`Analyzing document ${documentId} for user ${userId}`);

    // Update status to processing
    await supabase
      .from('user_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Create system prompt based on document type
    let systemPrompt = '';
    if (documentType === 'nutrition') {
      systemPrompt = `You are a nutrition analysis AI. Extract key information from meal plans including:
- Daily calorie targets
- Macronutrient breakdown (carbs, protein, fat percentages)
- Meal timing and frequency
- Special dietary considerations (allergies, restrictions, supplements)
- Specific foods and portion sizes
Return structured JSON with these fields.`;
    } else if (documentType === 'medical') {
      systemPrompt = `You are a medical document analysis AI. Extract key information including:
- Diagnosed conditions and their severity
- Current medications and dosages
- Lab results with reference ranges
- Doctor recommendations
- Injury history and recovery status
- Allergies and contraindications
Return structured JSON with these fields. Mark sensitive information.`;
    } else if (documentType === 'training') {
      systemPrompt = `You are a training program analysis AI. Extract key information including:
- Training phase (base, build, peak, taper, recovery)
- Weekly volume and intensity
- Key workouts and their purposes
- Progression plan and timeline
- Race/competition dates
- Recovery protocols
Return structured JSON with these fields.`;
    }

    // Call Lovable AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this document content:\n\n${fileContent}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiSummary = aiData.choices[0].message.content;

    // Parse AI response as JSON
    let insightData;
    try {
      insightData = JSON.parse(aiSummary);
    } catch (e) {
      // If not valid JSON, wrap as text
      insightData = { raw_analysis: aiSummary };
    }

    // Store insights
    const { data: insight } = await supabase
      .from('document_insights')
      .insert({
        document_id: documentId,
        user_id: userId,
        insight_type: documentType,
        insight_data: insightData,
        confidence_score: 0.85
      })
      .select()
      .single();

    // Update user_documents with summary
    await supabase
      .from('user_documents')
      .update({
        ai_summary: typeof aiSummary === 'string' ? aiSummary.substring(0, 500) : JSON.stringify(aiSummary).substring(0, 500),
        processing_status: 'completed',
        parsed_content: insightData
      })
      .eq('id', documentId);

    // Update user_context_enhanced
    const contextField = `${documentType}_profile`;
    await supabase.rpc('update_user_context', {
      p_user_id: userId,
      p_field: contextField,
      p_data: insightData
    });

    console.log(`Document analysis completed for ${documentId}`);

    return new Response(
      JSON.stringify({ success: true, insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to mark document as failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { documentId } = await req.json();
      
      await supabase
        .from('user_documents')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);
    } catch (e) {
      console.error('Failed to update document status:', e);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
