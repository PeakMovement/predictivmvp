import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { practitioner_email, practitioner_name, practitioner_type } = await req.json();

    if (!practitioner_email) {
      return new Response(JSON.stringify({ error: "practitioner_email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = practitioner_email.toLowerCase().trim();

    // Check if this practitioner already has active access
    const { data: existing } = await supabase
      .from("practitioner_access")
      .select("id, is_active")
      .eq("patient_id", user.id)
      .eq("practitioner_email", email)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "This practitioner already has active access." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up practitioner by email (using admin API)
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const practitionerUser = existingUsers?.find(u => u.email?.toLowerCase() === email);
    const practitionerId = practitionerUser?.id ?? null;

    // Create the access record
    const { data: accessRecord, error: insertError } = await supabase
      .from("practitioner_access")
      .insert({
        practitioner_id: practitionerId,
        patient_id: user.id,
        practitioner_email: email,
        practitioner_name: practitioner_name?.trim() || null,
        practitioner_type: practitioner_type || "other",
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[send-practitioner-invite] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get patient name for the invite email
    const { data: patientProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const patientName = patientProfile?.full_name || user.email || "Your patient";
    const practitionerFirstName = practitioner_name?.split(" ")[0] || "there";
    const appUrl = Deno.env.get("APP_URL") || "https://predictiv.netlify.app";

    // If practitioner already has an account, send them a notification email
    // If not, send a signup invite via Supabase admin
    if (practitionerUser) {
      // Practitioner already has an account — send notification
      // In production use a transactional email provider (Resend, SendGrid, etc.)
      // For now, log and respond with success
    } else {
      // Invite new practitioner to sign up
      try {
        await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${appUrl}/practitioner`,
          data: {
            role: "practitioner",
            invited_by_patient: patientName,
            practitioner_name: practitioner_name || null,
            practitioner_type: practitioner_type || "other",
          },
        });
      } catch (inviteErr) {
        // Non-fatal — record is already created
        console.warn(`[send-practitioner-invite] Could not send invite email: ${inviteErr}`);
      }
    }


    return new Response(
      JSON.stringify({
        success: true,
        access_id: accessRecord.id,
        practitioner_has_account: !!practitionerUser,
        message: practitionerUser
          ? `Access granted. ${practitioner_name || email} will see your data next time they log in.`
          : `Invite sent to ${email}. They'll receive an email to create their Predictiv account.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-practitioner-invite] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
