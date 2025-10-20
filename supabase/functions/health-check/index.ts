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

  const checks = {
    database: false,
    storage: false,
    ai_gateway: false,
    secrets: false
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Test DB connection
    const { error: dbError } = await supabaseAdmin.from('user_documents').select('id').limit(1);
    checks.database = !dbError;

    // Test storage access
    const { error: storageError } = await supabaseAdmin.storage.listBuckets();
    checks.storage = !storageError;

    // Test AI gateway
    checks.ai_gateway = !!Deno.env.get('LOVABLE_API_KEY');
    checks.secrets = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  } catch (error) {
    console.error('[health-check] Error:', error);
  }

  return new Response(JSON.stringify({
    status: Object.values(checks).every(Boolean) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
