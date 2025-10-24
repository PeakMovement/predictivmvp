/**
 * Mock Fitbit Data Testing Script - Deprecated
 * Fitbit OAuth authentication has been removed from this project.
 * This file is kept for reference only.
 */

export async function fetchMockFitbitData() {
  console.warn("⚠️ Fitbit authentication has been removed from this project");
  return { success: false, error: "Fitbit OAuth removed - awaiting new auth system" };
}

export async function testFitbitTokenExchange() {
  console.warn("⚠️ Fitbit token exchange has been removed from this project");
  return { success: false, error: "Fitbit OAuth removed - awaiting new auth system" };
}

export default fetchMockFitbitData;
