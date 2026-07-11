/**
 * Deriv OAuth 2.0 with PKCE — client-side helpers.
 *
 * Login flow  : loginWithDeriv() → Deriv auth page → /api/auth/callback (serverless)
 *                  → sets httpOnly cookie + deriv_session cookie → /dashboard
 * Session check: isAuthenticated() reads the JS-readable `deriv_session` cookie.
 * Logout       : logout() calls /api/auth/logout to clear server cookies, then / .
 */

const APP_ID = import.meta.env.VITE_DERIV_APP_ID ?? '';
const SITE_URL = import.meta.env.VITE_SITE_URL ?? window.location.origin;

// ---------------------------------------------------------------------------
// PKCE helpers (mirrors temp-app/app/login/page.tsx)
// ---------------------------------------------------------------------------
function base64UrlEncode(value: Uint8Array | ArrayBuffer): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createPkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const random = new Uint8Array(64);
  crypto.getRandomValues(random);
  const codeVerifier = base64UrlEncode(random);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

/** Write a cookie the server can also read (no httpOnly — set by client). */
function setCookie(name: string, value: string, maxAge = 60 * 60 * 24 * 7): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/** Read a cookie by name. */
function getCookie(name: string): string | null {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Kick off the Deriv PKCE OAuth flow.
 * Optionally pass `accountType` ("real" | "demo") to pre-select in the callback.
 */
export async function loginWithDeriv(accountType: 'real' | 'demo' = 'real'): Promise<void> {
  if (!APP_ID) {
    console.error('[derivAuth] VITE_DERIV_APP_ID is not set');
    return;
  }

  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = crypto.randomUUID();
  const redirectUri = `${SITE_URL}/api/auth/callback`;

  // Store PKCE material in cookies so the serverless callback can read them
  setCookie('pkce_verifier', codeVerifier);
  setCookie('oauth_state', state);
  setCookie('deriv_account_preference', accountType, 60 * 60 * 24);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: APP_ID,
    redirect_uri: redirectUri,
    scope: 'trade account_manage',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  console.log('[derivAuth] Redirecting to Deriv OAuth…', redirectUri);
  window.location.assign(`https://auth.deriv.com/oauth2/auth?${params.toString()}`);
}

/**
 * Returns true when the `deriv_session` cookie is present.
 * This cookie is set by the serverless callback after a successful token exchange.
 * It is NOT httpOnly, so the SPA can read it.
 */
export function isAuthenticated(): boolean {
  return getCookie('deriv_session') === '1';
}

/** Clear session cookies and redirect to the landing page. */
export function logout(): void {
  // Clear the JS-readable session flag immediately
  setCookie('deriv_session', '', 0);
  setCookie('deriv_account_id', '', 0);
  // The httpOnly auth token is cleared by the serverless logout endpoint
  fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
    window.location.href = '/';
  });
}

/** Legacy — kept so Dashboard.tsx doesn't break. Returns minimal shape. */
export function getAuthData(): { account: string; currency: string } | null {
  const accountId = getCookie('deriv_account_id');
  if (!accountId) return null;
  return { account: accountId, currency: 'USD' };
}

/** Legacy alias used by Dashboard.tsx logout handler. */
export { logout as logoutUser };
