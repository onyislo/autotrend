// CORRECT DERIV OAUTH 2.0 WITH PKCE - FOLLOWING DOCUMENTATION
const DERIV_APP_ID = '33LvvK8qit4Q2yXrRMiPAY';

// Generate PKCE parameters
const generatePKCE = async () => {
  // 1. Generate code_verifier
  const array = crypto.getRandomValues(new Uint8Array(64));
  const codeVerifier = Array.from(array)
    .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
    .join('');

  // 2. Generate code_challenge
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // 3. Generate state
  const state = crypto.getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');

  return { codeVerifier, codeChallenge, state };
};

export const loginWithDeriv = async () => {
  const { codeVerifier, codeChallenge, state } = await generatePKCE();
  
  // Store for later use
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);
  
  // Build OAuth URL - only use client_id for OAuth2 apps
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: DERIV_APP_ID,
    redirect_uri: 'https://autotrendx.qzz.io/auth/callback',
    scope: 'trade account_manage',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
    // Remove app_id since this is a proper OAuth2 app
  });
  
  const authUrl = `https://auth.deriv.com/oauth2/auth?${params.toString()}`;
  
  console.log('🚀 OAuth URL:', authUrl);
  window.location.href = authUrl;
};

export const handleCallback = () => {
  console.log('🔐 Processing OAuth callback...');
  console.log('Current URL:', window.location.href);
  
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for errors first
  const error = urlParams.get('error');
  if (error) {
    console.log('❌ OAuth error:', error, urlParams.get('error_description'));
    return false;
  }
  
  // Verify state (CSRF protection)
  const returnedState = urlParams.get('state');
  const storedState = sessionStorage.getItem('oauth_state');
  
  if (!returnedState || returnedState !== storedState) {
    console.log('❌ State mismatch - possible CSRF attack');
    return false;
  }
  
  // Get authorization code
  const code = urlParams.get('code');
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  
  if (code && codeVerifier) {
    console.log('✅ Got authorization code, exchanging for token...');
    
    // In a real app, this should be done server-side
    // But for this demo, we'll simulate the token exchange
    exchangeCodeForToken(code, codeVerifier);
    return true;
  }
  
  console.log('❌ No authorization code found');
  return false;
};

const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
  try {
    // This should normally be done on your backend
    const response = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: DERIV_APP_ID,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: 'https://autotrendx.qzz.io/auth/callback'
      })
    });
    
    if (response.ok) {
      const tokenData = await response.json();
      
      // Store the access token
      localStorage.setItem('deriv_auth', JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        timestamp: Date.now()
      }));
      
      sessionStorage.setItem('auth_status', 'authenticated');
      
      // Clean up
      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('oauth_state');
      
      console.log('✅ Token exchange successful');
      window.location.href = '/dashboard';
    } else {
      console.log('❌ Token exchange failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Token exchange error:', error);
  }
};

export const isLoggedIn = (): boolean => {
  if (sessionStorage.getItem('auth_status') === 'authenticated') {
    return true;
  }
  
  const authData = localStorage.getItem('deriv_auth');
  if (authData) {
    sessionStorage.setItem('auth_status', 'authenticated');
    return true;
  }
  
  return false;
};

export const getUserData = () => {
  const authData = localStorage.getItem('deriv_auth');
  if (authData) {
    try {
      return JSON.parse(authData);
    } catch {
      return null;
    }
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem('deriv_auth');
  sessionStorage.removeItem('auth_status');
  window.location.href = '/';
};