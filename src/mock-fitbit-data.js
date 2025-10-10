/**
 * Mock Fitbit Data Testing Script
 * Tests the Supabase Edge Function for Fitbit token exchange
 */

const SUPABASE_URL = "https://ixtwbkikyuexskdgfpfq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg";

/**
 * Fetches data from the Fitbit token exchange endpoint
 * @param {string} authCode - The authorization code from Fitbit OAuth
 * @returns {Promise<Object>} The response data from the endpoint
 */
export async function testFitbitTokenExchange(authCode = "test_code_12345") {
  try {
    console.log("🔄 Testing Fitbit token exchange endpoint...");
    console.log(`📍 Endpoint: ${SUPABASE_URL}/functions/v1/exchange-fitbit-token`);
    console.log(`🔑 Auth Code: ${authCode}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/exchange-fitbit-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ code: authCode }),
    });

    const data = await response.json();

    console.log("📊 Response Status:", response.status);
    console.log("📦 Response Data:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("✅ Token exchange successful!");
      console.log("🎉 Access Token:", data.data?.access_token ? "Present" : "Missing");
      console.log("🎉 Refresh Token:", data.data?.refresh_token ? "Present" : "Missing");
      console.log("🎉 User ID:", data.data?.user_id || "N/A");
    } else {
      console.warn("⚠️ Token exchange failed:", data.error);
    }

    return data;
  } catch (error) {
    console.error("❌ Error testing Fitbit endpoint:", error);
    throw error;
  }
}

/**
 * Auto-run test when module is loaded (for preview/testing)
 */
if (typeof window !== "undefined") {
  // Run test automatically in browser environment
  window.addEventListener("load", () => {
    console.log("🚀 Auto-testing Fitbit Edge Function...");
    testFitbitTokenExchange()
      .then((result) => {
        console.log("✨ Test completed successfully");
        // Display in UI if there's a result container
        const resultContainer = document.getElementById("fitbit-test-result");
        if (resultContainer) {
          resultContainer.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        }
      })
      .catch((error) => {
        console.error("💥 Test failed:", error);
      });
  });
}

export default testFitbitTokenExchange;
