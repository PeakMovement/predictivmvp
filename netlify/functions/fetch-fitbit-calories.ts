import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const handler = async (event) => {
  console.log("🚀 fetch-fitbit-calories function invoked");

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "OK",
    };
  }

  try {
    // Validate environment variables
    const accessToken = process.env.FITBIT_ACCESS_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("🔍 Checking environment variables...");
    if (!accessToken) {
      console.error("❌ Missing FITBIT_ACCESS_TOKEN");
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "FITBIT_ACCESS_TOKEN not configured" }),
      };
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase configuration");
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Supabase configuration missing" }),
      };
    }

    console.log("✅ Environment variables validated");

    // Fetch calorie data from Fitbit API
    console.log("📡 Fetching calorie data from Fitbit API...");
    const fitbitUrl = "https://api.fitbit.com/1/user/-/activities/calories/date/today/1d.json";
    
    const fitbitResponse = await fetch(fitbitUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fitbitResponse.ok) {
      const errorText = await fitbitResponse.text();
      console.error(`❌ Fitbit API error (${fitbitResponse.status}):`, errorText);
      return {
        statusCode: fitbitResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Failed to fetch data from Fitbit",
          details: errorText,
          status: fitbitResponse.status,
        }),
      };
    }

    const caloriesData = await fitbitResponse.json();
    console.log("✅ Fitbit data received:", JSON.stringify(caloriesData, null, 2));

    // Initialize Supabase client
    console.log("🔌 Initializing Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert data into fitbit_auto_data table
    console.log("💾 Inserting data into Supabase fitbit_auto_data table...");
    const { data: insertedData, error: insertError } = await supabase
      .from("fitbit_auto_data")
      .insert([
        {
          user_id: "CTBNRR",
          activity: caloriesData,
          fetched_at: new Date().toISOString(),
        },
      ])
      .select();

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Failed to insert data into Supabase",
          details: insertError.message,
        }),
      };
    }

    console.log("✅ Data inserted successfully:", insertedData);

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Calories data saved successfully",
        data: caloriesData,
        inserted: insertedData,
      }),
    };
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
    };
  }
};
