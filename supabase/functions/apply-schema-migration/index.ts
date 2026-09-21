import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  const body = await req.json().catch(() => ({}));
  const files: string[] = body.files ?? [];
  const results: Array<Record<string, unknown>> = [];

  for (const f of files) {
    const { data, error } = await supabase.storage.from("schema-migration").download(f);
    if (error || !data) {
      results.push({ file: f, ok: false, stage: "download", error: error?.message ?? "no data" });
      break;
    }
    const sql = await data.text();
    const { error: rpcError } = await supabase.rpc("__apply_schema_sql", { sql });
    if (rpcError) {
      results.push({ file: f, ok: false, stage: "execute", error: rpcError.message });
      break;
    }
    results.push({ file: f, ok: true, bytes: sql.length });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
