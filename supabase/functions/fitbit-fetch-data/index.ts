import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const { user_id, date } = await req.json();
  if (!user_id) {
    return new Response("Missing user_id", { status: 400 });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: tokenRow } = await supabase
    .from("fitbit_tokens")
    .select()
    .eq("user_id", user_id)
    .single();

  if (!tokenRow) {
    return new Response(JSON.stringify({ error: "Token not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const accessToken = tokenRow.access_token;
  const day = date || new Date().toISOString().split("T")[0];
  const [actResp, sleepResp] = await Promise.all([
    fetch(`https://api.fitbit.com/1/user/-/activities/date/${day}.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${day}.json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  const activity = await actResp.json();
  const sleepData = await sleepResp.json();
  await supabase.from("fitbit_auto_data").upsert({
    user_id,
    date: day,
    activity_data: activity,
    sleep_data: sleepData,
    fetched_at: new Date().toISOString(),
  });
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
});
