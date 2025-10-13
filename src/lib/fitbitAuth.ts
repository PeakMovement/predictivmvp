/**
 * Fitbit OAuth with PKCE (Proof Key for Code Exchange)
 * This provides enhanced security for the OAuth flow
 */

/**
 * Base64 URL encode helper function
 * Converts binary data to base64url format (RFC 4648)
 */
function base64urlencode(buffer: Uint8Array | ArrayBuffer): string {
  const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...uint8Array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates the Fitbit OAuth flow with PKCE
 * Generates code_verifier and code_challenge, then redirects to Fitbit
 */
export async function startFitbitAuth() {
  try {
    // Generate a cryptographically secure random code verifier
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const code_verifier = base64urlencode(array.buffer);
    
    // Store code_verifier in sessionStorage for later use during token exchange
    sessionStorage.setItem('fitbit_code_verifier', code_verifier);

    // Create code_challenge by hashing the code_verifier with SHA-256
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier));
    const code_challenge = base64urlencode(digest);

    // Build authorization URL with PKCE parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: '23TG3N',
      redirect_uri: 'https://predictiv.netlify.app/fitbit/callback',
      scope: 'activity heartrate sleep oxygen_saturation profile weight',
      code_challenge: code_challenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;

    // Debug logging
    console.log("🔑 Fitbit Auth Debug →");
    console.log({ code_verifier, code_challenge, authUrl });

    // Redirect to Fitbit OAuth authorization page
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating Fitbit auth:', error);
    throw error;
  }
}
