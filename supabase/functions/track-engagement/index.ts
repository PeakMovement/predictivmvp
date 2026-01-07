import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventType = 
  | 'recommendation_viewed'
  | 'recommendation_followed'
  | 'recommendation_dismissed'
  | 'recommendation_helpful'
  | 'recommendation_not_helpful'
  | 'symptom_logged'
  | 'chat_initiated'
  | 'briefing_viewed'
  | 'app_opened';

interface TrackEngagementRequest {
  event_type: EventType;
  target_id?: string;
  target_type?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TrackEngagementRequest = await req.json();
    
    if (!body.event_type) {
      return new Response(
        JSON.stringify({ success: false, error: "event_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validEventTypes: EventType[] = [
      'recommendation_viewed',
      'recommendation_followed',
      'recommendation_dismissed',
      'recommendation_helpful',
      'recommendation_not_helpful',
      'symptom_logged',
      'chat_initiated',
      'briefing_viewed',
      'app_opened',
    ];

    if (!validEventTypes.includes(body.event_type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert engagement event
    const { data, error } = await supabase.from("engagement_events").insert({
      user_id: user.id,
      event_type: body.event_type,
      target_id: body.target_id || null,
      target_type: body.target_type || null,
      metadata: body.metadata || {},
    }).select().single();

    if (error) throw error;

    // If this is a recommendation outcome, also update recommendation_outcomes table
    if (body.event_type === 'recommendation_followed' || 
        body.event_type === 'recommendation_helpful' || 
        body.event_type === 'recommendation_not_helpful') {
      
      if (body.target_id) {
        const outcomeType = body.event_type === 'recommendation_followed' ? 'followed' : 
                           (body.event_type === 'recommendation_helpful' ? 'followed' : 'ignored');
        const userFeedback = body.event_type === 'recommendation_helpful' ? 'helpful' :
                            (body.event_type === 'recommendation_not_helpful' ? 'not_helpful' : 'neutral');

        await supabase.from("recommendation_outcomes").insert({
          user_id: user.id,
          recommendation_id: body.target_id,
          outcome_type: outcomeType,
          user_feedback: userFeedback,
          notes: body.metadata?.notes as string || null,
        });

        // Update the recommendation's feedback score if helpful/not helpful
        if (body.event_type === 'recommendation_helpful' || body.event_type === 'recommendation_not_helpful') {
          const feedbackScore = body.event_type === 'recommendation_helpful' ? 5 : 1;
          await supabase.from("yves_recommendations")
            .update({ 
              feedback_score: feedbackScore,
              acknowledged_at: new Date().toISOString()
            })
            .eq("id", body.target_id);
        }
      }
    }

    console.log(`[track-engagement] User ${user.id}: ${body.event_type}${body.target_id ? ` (target: ${body.target_id})` : ''}`);

    return new Response(
      JSON.stringify({ success: true, event_id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[track-engagement] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
