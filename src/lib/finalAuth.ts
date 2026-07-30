// Deriv OAuth 2.0 with PKCE - copied from deriv-trading-app/app/SignInClient.tsx
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33MJcHX2yZOr6lkeIP9Mg';
// Must match exactly what's in the serverless function AND Deriv app settings
const REDIRECT_URI = 'https://autotrendx.qzz.io/api/auth/callback';

// ── PKCE helpers (copied from deriv-trading-app) ──────────────────────────────
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

// ── Login - copied from deriv-trading-app/app/SignInClient.tsx ────────────────
export const loginWithDeriv = async (): Promise<void> => {
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = crypto.randomUUID();

  sessionStorage.setItem('pkce_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);
  // Also store in localStorage as backup in case sessionStorage is cleared
  localStorage.setItem('pkce_verifier_backup', codeVerifier);
  localStorage.setItem('oauth_state_backup', state);
  // Store in cookies for the serverless /api/auth/callback function
  document.cookie = `pkce_verifier=${encodeURIComponent(codeVerifier)}; path=/; max-age=600; SameSite=Lax`;
  document.cookie = `oauth_state=${encodeURIComponent(state)}; path=/; max-age=600; SameSite=Lax`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DERIV_APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'trade account_manage',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  console.log('🚀 Redirecting to:', `https://auth.deriv.com/oauth2/auth?${params.toString()}`);
  window.location.assign(`https://auth.deriv.com/oauth2/auth?${params.toString()}`);
};

// ── Callback - copied from deriv-trading-app/app/api/auth/callback/route.ts ──
export const handleCallback = async (): Promise<boolean> => {
  const urlParams = new URLSearchParams(window.location.search);

  const error = urlParams.get('error');
  if (error) {
    console.error('❌ OAuth error:', error, urlParams.get('error_description'));
    return false;
  }

  const code = urlParams.get('code');
  const returnedState = urlParams.get('state');
  // Check sessionStorage first, fallback to localStorage
  const storedState = sessionStorage.getItem('oauth_state') || localStorage.getItem('oauth_state_backup');
  const codeVerifier = sessionStorage.getItem('pkce_verifier') || localStorage.getItem('pkce_verifier_backup');

  if (!code || !codeVerifier) {
    console.error('❌ Missing code or verifier');
    return false;
  }

  if (returnedState && storedState && returnedState !== storedState) {
    console.error('❌ State mismatch');
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

    // Fetch accounts - copied from deriv-trading-app callback route
    let accountId = null;
    let accountType = 'real';
    let currency = 'USD';

    try {
      const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Deriv-App-ID': DERIV_APP_ID,
        },
      });

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json() as {
          data?: Array<{ account_id?: string; account_type?: string; currency?: string }>
        };
        const accounts = accountsData.data ?? [];
        const real = accounts.find(a => a.account_type !== 'demo');
        const chosen = real ?? accounts[0];
        if (chosen) {
          accountId = chosen.account_id;
          accountType = chosen.account_type ?? 'real';
          currency = chosen.currency ?? 'USD';
        }
        console.log('✅ Accounts:', accounts.length);
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch accounts:', e);
    }

    localStorage.setItem('deriv_auth', JSON.stringify({
      access_token: tokenData.access_token,
      account: accountId,
      account_type: accountType,
      currency,
      timestamp: Date.now()
    }));
    sessionStorage.setItem('auth_status', 'authenticated');
    sessionStorage.removeItem('pkce_verifier');
    sessionStorage.removeItem('oauth_state');
    localStorage.removeItem('pkce_verifier_backup');
    localStorage.removeItem('oauth_state_backup');

    console.log('✅ Auth complete → dashboard');
    window.location.href = '/dashboard';
    return true;

  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
};

export const isLoggedIn = (): boolean => {
  if (sessionStorage.getItem('auth_status') === 'authenticated') return true;
  // Check cookie set by serverless function
  if (document.cookie.includes('deriv_session=1')) {
    sessionStorage.setItem('auth_status', 'authenticated');
    return true;
  }
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
