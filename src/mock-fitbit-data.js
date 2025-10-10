/**
 * Mock Fitbit Data Testing Script
 * Fetches live simulated Fitbit data from your Supabase Edge Function
 */

const SUPABASE_URL = "https://ixtwbkikyuexskdgfpfq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg";

/**
 * Fetches live Fitbit-style mock data
 */
export async function fetchMockFitbitData() {
  try {
    console.log("🔄 Fetching mock Fitbit data...");
    const endpoint = `${SUPABASE_URL}/functions/v1/mock-fitbit-data`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const data = await response.json();

    console.log("📊 Response Status:", response.status);
    console.log("📦 Response Data:", JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log("✅ Mock data fetched successfully!");
      const metrics = data.inserted;
      console.log("💓 HR:", metrics.heart_rate);
      console.log("📈 HRV:", metrics.hrv);
      console.log("🚶 Steps:", metrics.steps);
      console.log("⚖️  Training Load:", metrics.training_load);
    } else {
      console.warn("⚠️ Fetch failed:", data.error || "Unknown error");
    }

    // Display in the app UI if element exists
    const container = document.getElementById("fitbit-test-result");
    if (container) {
      container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }

    return data;
  } catch (error) {
    console.error("❌ Error fetching mock Fitbit data:", error);
    throw error;
  }
}

/**
 * Auto-run test in browser
 */
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    console.log("🚀 Auto-testing mock-fitbit-data function...");
    fetchMockFitbitData()
      .then(() => console.log("✨ Test complete"))
      .catch((error) => console.error("💥 Test failed:", error));
  });
}

export default fetchMockFitbitData;
