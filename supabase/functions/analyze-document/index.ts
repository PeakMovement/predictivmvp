
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";
import { RateLimiter, RATE_LIMIT_CONFIGS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── AUTH ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RATE LIMITING ───────────────────────────────────────────────────────
    const rateLimiter = new RateLimiter();
    const rateLimitResult = await rateLimiter.checkRateLimit(
      user.id,
      RATE_LIMIT_CONFIGS.DOCUMENT_UPLOAD
    );

    if (!rateLimitResult.allowed) {
      return rateLimiter.createRateLimitResponse(rateLimitResult);
    }

    // ─── INPUT VALIDATION ─────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return new Response(
        JSON.stringify({ error: 'Request body must be an object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = body as { documentId?: unknown; userId?: unknown; documentType?: unknown; fileContent?: unknown };

    // UUID format validation helper
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Validate documentId (required UUID)
    if (!rawBody.documentId || typeof rawBody.documentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'documentId is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!uuidRegex.test(rawBody.documentId)) {
      return new Response(
        JSON.stringify({ error: 'documentId must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate userId (required UUID)
    if (!rawBody.userId || typeof rawBody.userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userId is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!uuidRegex.test(rawBody.userId)) {
      return new Response(
        JSON.stringify({ error: 'userId must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate documentType (required enum)
    const validDocumentTypes = ['nutrition', 'medical', 'training'];
    if (!rawBody.documentType || typeof rawBody.documentType !== 'string') {
      return new Response(
        JSON.stringify({ error: 'documentType is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!validDocumentTypes.includes(rawBody.documentType)) {
      return new Response(
        JSON.stringify({ error: `documentType must be one of: ${validDocumentTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate fileContent (required string with length limit)
    if (!rawBody.fileContent || typeof rawBody.fileContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fileContent is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Limit file content to 500KB to prevent DoS
    if (rawBody.fileContent.length > 512000) {
      return new Response(
        JSON.stringify({ error: 'fileContent exceeds maximum size of 500KB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentId = rawBody.documentId;
    const userId = rawBody.userId;
    const documentType = rawBody.documentType;
    const fileContent = rawBody.fileContent;

    console.log(`[analyze-document] Analyzing document ${documentId} for user ${userId}, type: ${documentType}, content length: ${fileContent?.length}`);

    // Create processing log entry
    const { data: logEntry } = await supabase
      .from('document_processing_log')
      .insert({
        user_id: userId,
        document_id: documentId,
        status: 'processing',
        processing_steps: [{ step: 'started', timestamp: new Date().toISOString() }]
      })
      .select()
      .single();

    await supabase
      .from('user_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    let processedContent = fileContent;
    try {
      const parsed = JSON.parse(fileContent);
      if (parsed.type === 'binary' && parsed.encoding === 'base64') {
        console.log('[analyze-document] Detected binary content, skipping full decode');
        processedContent = `[Binary file: ${parsed.metadata.name}, ${parsed.metadata.size} bytes, type: ${parsed.metadata.type}]`;
      }
    } catch {
      // Not JSON, treat as plain text
    }

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

    const systemPrompt = `You are a ${documentType} document analysis AI. Extract structured information accurately from the document.`;

    const ai = getAIProvider();

    const aiResponse = await ai.chat({
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
      toolChoice: { type: "function", function: { name: `extract_${documentType}_data` } }
    });

    console.log('[analyze-document] AI analysis complete');

    let insightData;
    let aiSummary;

    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      insightData = JSON.parse(aiResponse.toolCalls[0].arguments);
      aiSummary = `Structured ${documentType} data extracted successfully`;
      console.log('[analyze-document] Extracted structured data:', JSON.stringify(insightData).substring(0, 200));
    } else {
      aiSummary = aiResponse.content;
      try {
        insightData = JSON.parse(aiSummary);
      } catch (e) {
        insightData = { raw_analysis: aiSummary };
      }
    }

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

    await supabase
      .from('user_documents')
      .update({
        ai_summary: typeof aiSummary === 'string' ? aiSummary.substring(0, 500) : JSON.stringify(aiSummary).substring(0, 500),
        processing_status: 'completed',
        parsed_content: insightData
      })
      .eq('id', documentId);

    const contextField = `${documentType}_profile`;
    await supabase.rpc('update_user_context', {
      p_user_id: userId,
      p_field: contextField,
      p_data: insightData
    });

    console.log(`[analyze-document] Document analysis completed for ${documentId}`);

    // Update processing log with analysis step
    if (logEntry) {
      await supabase
        .from('document_processing_log')
        .update({
          processing_steps: [
            ...(logEntry.processing_steps || []),
            { step: 'analysis_complete', timestamp: new Date().toISOString() }
          ]
        })
        .eq('id', logEntry.id);
    }

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

      // Update processing log with profile rebuild step
      if (logEntry) {
        await supabase
          .from('document_processing_log')
          .update({
            processing_steps: [
              ...(logEntry.processing_steps || []),
              { step: 'profile_rebuild_triggered', timestamp: new Date().toISOString() }
            ]
          })
          .eq('id', logEntry.id);
      }
    } catch (profileError) {
      console.error('[analyze-document] Failed to trigger profile rebuild:', profileError);
    }

    // Generate recommendations based on document type
    try {
      const recommendationPrompt = `Based on this ${documentType} document analysis, generate 3 actionable recommendations for the user:\n${JSON.stringify(insightData)}`;
      
      const recommendationResponse = await ai.chat({
        messages: [
          { role: 'system', content: 'You are a health coach generating actionable recommendations.' },
          { role: 'user', content: recommendationPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_recommendations",
            description: "Generate personalized health recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] }
                    }
                  }
                }
              }
            }
          }
        }],
        toolChoice: { type: "function", function: { name: "generate_recommendations" } }
      });

      if (recommendationResponse.toolCalls && recommendationResponse.toolCalls.length > 0) {
        const recommendations = JSON.parse(recommendationResponse.toolCalls[0].arguments).recommendations;
        
        for (const rec of recommendations) {
          await supabase
            .from('yves_recommendations')
            .insert({
              user_id: userId,
              recommendation_text: rec.text,
              category: documentType,
              priority: rec.priority || 'medium',
              source: 'document_analysis'
            });
        }
        console.log(`[analyze-document] Generated ${recommendations.length} recommendations`);
      }
    } catch (recError) {
      console.error('[analyze-document] Failed to generate recommendations:', recError);
    }

    // Mark processing as complete
    if (logEntry) {
      await supabase
        .from('document_processing_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_steps: [
            ...(logEntry.processing_steps || []),
            { step: 'completed', timestamp: new Date().toISOString() }
          ]
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ success: true, insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[analyze-document] Error analyzing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const body = await req.json();
      const { documentId, userId } = body;

      await supabase
        .from('user_documents')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);

      // Update processing log with error
      await supabase
        .from('document_processing_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('document_id', documentId)
        .eq('user_id', userId);

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
