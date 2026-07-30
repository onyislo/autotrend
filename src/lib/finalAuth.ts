// Deriv OAuth 2.0 with PKCE - matches deriv-trading-app implementation
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33LvvK8qit4Q2yXrRMiPAY';
const REDIRECT_URI = 'https://autotrendx.qzz.io/auth/callback';

// PKCE helpers - exact same as deriv-trading-app
function base64UrlEncode(value: Uint8Array | ArrayBuffer): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createPkcePair() {
  const randomValues = new Uint8Array(64);
  crypto.getRandomValues(randomValues);
  const codeVerifier = base64UrlEncode(randomValues);
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

// Login - matches SignInClient.tsx from deriv-trading-app
export const loginWithDeriv = async () => {
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = crypto.randomUUID();

  // Store in sessionStorage (not cookies since we have no server)
  sessionStorage.setItem('pkce_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DERIV_APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'trade account_manage',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  console.log('🚀 Redirecting to Deriv OAuth:', `https://auth.deriv.com/oauth2/auth?${params.toString()}`);
  window.location.assign(`https://auth.deriv.com/oauth2/auth?${params.toString()}`);
};

// Callback handler - matches callback/route.ts from deriv-trading-app
export const handleCallback = async (): Promise<boolean> => {
  const urlParams = new URLSearchParams(window.location.search);

  const error = urlParams.get('error');
  if (error) {
    console.error('❌ OAuth error:', error, urlParams.get('error_description'));
    return false;
  }

  const code = urlParams.get('code');
  const returnedState = urlParams.get('state');
  const storedState = sessionStorage.getItem('oauth_state');
  const codeVerifier = sessionStorage.getItem('pkce_verifier');

  if (!code || !codeVerifier) {
    console.error('❌ Missing code or code verifier');
    return false;
  }

  if (returnedState && storedState && returnedState !== storedState) {
    console.error('❌ State mismatch - possible CSRF attack');
    return false;
  }

  console.log('🔄 Exchanging code for token...');

  try {
    const tokenResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: DERIV_APP_ID,
        code,
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      console.error('❌ Token exchange failed:', tokenData);
      return false;
    }

    console.log('✅ Token received, fetching accounts...');

    // Fetch accounts using the access token
    let account = null;
    try {
      const accountsResponse = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Deriv-App-ID': DERIV_APP_ID,
        },
      });

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json() as { data?: Array<{ account_id?: string; account_type?: string; currency?: string }> };
        const accounts = accountsData.data ?? [];
        account = accounts.find(a => a.account_type !== 'demo') ?? accounts[0];
        console.log('✅ Accounts fetched:', accounts.length);
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch accounts:', e);
    }

    // Store auth data
    localStorage.setItem('deriv_auth', JSON.stringify({
      access_token: tokenData.access_token,
      account_id: account?.account_id,
      account_type: account?.account_type,
      currency: account?.currency || 'USD',
      timestamp: Date.now()
    }));
    sessionStorage.setItem('auth_status', 'authenticated');

    // Clean up
    sessionStorage.removeItem('pkce_verifier');
    sessionStorage.removeItem('oauth_state');

    console.log('✅ Login complete, redirecting to dashboard...');
    window.location.href = '/dashboard';
    return true;

  } catch (err) {
    console.error('❌ Token exchange error:', err);
    return false;
  }
};

export const isLoggedIn = (): boolean => {
  if (sessionStorage.getItem('auth_status') === 'authenticated') return true;
  const data = localStorage.getItem('deriv_auth');
  if (data) { sessionStorage.setItem('auth_status', 'authenticated'); return true; }
  return false;
};

export const getUserData = () => {
  try {
    const data = localStorage.getItem('deriv_auth');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const logout = () => {
  localStorage.removeItem('deriv_auth');
  sessionStorage.removeItem('auth_status');
  window.location.href = '/';
};
