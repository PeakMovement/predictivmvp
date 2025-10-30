
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const checks = {
    database: false,
    storage: false,
    ai_provider: false,
    ai_provider_name: 'none',
    ai_mock_mode: false,
    secrets: false
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabaseAdmin.from('user_documents').select('id').limit(1);
    checks.database = !dbError;

    const { error: storageError } = await supabaseAdmin.storage.listBuckets();
    checks.storage = !storageError;

    const aiProvider = Deno.env.get('AI_PROVIDER') || 'openai';
    const mockMode = Deno.env.get('AI_MOCK_MODE') === 'true';
    checks.ai_provider_name = aiProvider;
    checks.ai_mock_mode = mockMode;

    if (mockMode) {
      checks.ai_provider = true;
    } else {
      switch (aiProvider) {
        case 'openai':
          checks.ai_provider = !!Deno.env.get('OPENAI_API_KEY');
          break;
        case 'anthropic':
          checks.ai_provider = !!Deno.env.get('ANTHROPIC_API_KEY');
          break;
        case 'google':
          checks.ai_provider = !!Deno.env.get('GOOGLE_AI_API_KEY');
          break;
        default:
          checks.ai_provider = false;
      }
    }

    checks.secrets = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  } catch (error) {
    console.error('[health-check] Error:', error);
  }

  return new Response(JSON.stringify({
    status: Object.values(checks).filter(v => typeof v === 'boolean').every(Boolean) ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
});
