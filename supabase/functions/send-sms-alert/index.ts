import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  to: string;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse request body
    const { to, message }: SMSRequest = await req.json();

    // Validate South African number format
    if (!to || !to.startsWith('+27')) {
      console.error('Invalid phone number format:', to);
      await logNotification(to, message, 'failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid number - must start with +27' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!message || message.trim().length === 0) {
      console.error('Empty message provided');
      await logNotification(to, message, 'failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Message cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Sending SMS to ${to}`);

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', to);
    formData.append('Body', message);

    // Send SMS via Twilio
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', twilioData);
      await logNotification(to, message, 'failed');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: twilioData.message || 'Twilio auth failure or network error' 
        }),
        { status: twilioResponse.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`SMS sent successfully. SID: ${twilioData.sid}`);

    // Log successful delivery
    await logNotification(to, message, 'delivered');

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: twilioData.sid 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-sms-alert function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

// Helper function to log notifications to database
async function logNotification(recipient: string, message: string, status: 'delivered' | 'failed' | 'queued') {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('notification_log')
      .insert({
        recipient,
        message,
        status,
      });

    if (error) {
      console.error('Error logging notification:', error);
    } else {
      console.log(`Notification logged: ${recipient} - ${status}`);
    }
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}
