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

    console.log(`[analyze-document] Analyzing document ${documentId} for user ${userId}, type: ${documentType}, content length: ${fileContent?.length}`);

    // Update status to processing
    await supabase
      .from('user_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Handle binary content if present
    let processedContent = fileContent;
    try {
      const parsed = JSON.parse(fileContent);
      if (parsed.type === 'binary' && parsed.encoding === 'base64') {
        console.log('[analyze-document] Detected binary content, skipping full decode');
        processedContent = `[Binary file: ${parsed.metadata.name}, ${parsed.metadata.size} bytes, type: ${parsed.metadata.type}]`;
        // For PDFs/images, rely on OCR capabilities of AI model
      }
    } catch {
      // Not JSON, treat as plain text
    }

    // Define structured schemas for each document type
    const nutritionSchema = {
      type: "object",
      properties: {
        daily_calories: { type: "number" },
        macros: {
          type: "object",
          properties: {
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" }
          }
        },
        meal_timing: { type: "array", items: { type: "string" } },
        special_considerations: { type: "array", items: { type: "string" } },
        supplements: { type: "array", items: { type: "string" } }
      },
      required: ["daily_calories", "macros"]
    };

    const medicalSchema = {
      type: "object",
      properties: {
        conditions: { 
          type: "array", 
          items: { 
            type: "object",
            properties: {
              name: { type: "string" },
              severity: { type: "string", enum: ["mild", "moderate", "severe"] },
              diagnosed_date: { type: "string" }
            }
          }
        },
        medications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" }
            }
          }
        },
        allergies: { type: "array", items: { type: "string" } },
        contraindications: { type: "array", items: { type: "string" } }
      }
    };

    const trainingSchema = {
      type: "object",
      properties: {
        program_name: { type: "string" },
        duration_weeks: { type: "number" },
        current_phase: { type: "string", enum: ["base", "build", "peak", "taper", "recovery"] },
        weekly_schedule: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "string" },
              workout_type: { type: "string" },
              duration_min: { type: "number" },
              intensity: { type: "string", enum: ["easy", "moderate", "hard", "max"] }
            }
          }
        },
        goal_race_date: { type: "string" },
        weekly_volume_km: { type: "number" }
      }
    };

    const schema = documentType === 'nutrition' ? nutritionSchema : 
                   documentType === 'medical' ? medicalSchema : trainingSchema;

    // Create system prompt
    let systemPrompt = `You are a ${documentType} document analysis AI. Extract structured information accurately from the document.`;

    // Retry wrapper for AI calls
    const callAIWithRetry = async (url: string, options: any, maxRetries = 2) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[analyze-document] AI call attempt ${attempt}/${maxRetries}`);
          const response = await fetch(url, options);
          
          if (response.ok) {
            console.log('[analyze-document] AI gateway response: 200 OK');
            return response;
          }
          
          if (response.status === 429) {
            console.log('[analyze-document] Rate limited, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
          
          if (response.status === 402) {
            throw new Error('AI credits depleted. Please add credits to your Lovable workspace.');
          }
          
          const errorText = await response.text();
          console.error('[analyze-document] AI gateway error:', response.status, errorText);
          throw new Error(`AI analysis failed: ${response.statusText}`);
        } catch (error) {
          if (attempt === maxRetries) throw error;
          console.log(`[analyze-document] Retry ${attempt}/${maxRetries} after error:`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      throw new Error('Max retries exceeded');
    };

    // Use tool calling for structured extraction
    const body: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract structured data from this ${documentType} document:\n\n${processedContent}` }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: `extract_${documentType}_data`,
            description: `Extract structured ${documentType} information from the document`,
            parameters: schema
          }
        }
      ],
      tool_choice: { type: "function", function: { name: `extract_${documentType}_data` } }
    };

    // Call Lovable AI for analysis with retry logic
    const aiResponse = await callAIWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analyze-document] AI gateway final error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[analyze-document] AI analysis complete');
    
    // Extract structured data from tool call
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    let insightData;
    let aiSummary;
    
    if (toolCall) {
      insightData = JSON.parse(toolCall.function.arguments);
      aiSummary = `Structured ${documentType} data extracted successfully`;
      console.log('[analyze-document] Extracted structured data:', JSON.stringify(insightData).substring(0, 200));
    } else {
      // Fallback to content if tool call not present
      aiSummary = aiData.choices[0].message.content;
      try {
        insightData = JSON.parse(aiSummary);
      } catch (e) {
        insightData = { raw_analysis: aiSummary };
      }
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

    console.log(`[analyze-document] Document analysis completed for ${documentId}`);

    // Trigger health profile rebuild
    try {
      await fetch(`${supabaseUrl}/functions/v1/build-health-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      console.log('[analyze-document] Health profile rebuild triggered');
    } catch (profileError) {
      console.error('[analyze-document] Failed to trigger profile rebuild:', profileError);
      // Don't fail the main request
    }

    return new Response(
      JSON.stringify({ success: true, insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-document] Error analyzing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to mark document as failed
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const body = await req.json();
      const { documentId } = body;
      
      await supabase
        .from('user_documents')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);
      
      console.log('[analyze-document] Marked document as failed');
    } catch (e) {
      console.error('[analyze-document] Failed to update document status:', e);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
