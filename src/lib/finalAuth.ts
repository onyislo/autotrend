// DERIV OAUTH AUTHENTICATION - ENHANCED REDIRECT
const DERIV_APP_ID = '33LvvK8qit4Q2yXrRMiPAY';
const REDIRECT_URI = 'https://autotrendx.qzz.io/auth/callback';

export const loginWithDeriv = () => {
  // Add additional OAuth parameters for better redirect handling
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'en',
    brand: 'deriv',
    redirect_uri: REDIRECT_URI,
    response_type: 'code', // Explicit response type
    scope: 'read,trade,trading_information,payments' // Explicit scopes
  });
  
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
  
  console.log('🚀 Starting Deriv OAuth flow...');
  console.log('📍 App ID:', DERIV_APP_ID);
  console.log('🔗 Redirect URI:', REDIRECT_URI);
  console.log('🌐 Full OAuth URL:', oauthUrl);
  
  // Store the auth attempt timestamp
  sessionStorage.setItem('oauth_attempt', Date.now().toString());
  
  // Force a hard redirect (not just location.href)
  window.open(oauthUrl, '_self');
};

export const handleCallback = () => {
  console.log('🔐 Callback handler triggered!');
  console.log('📍 Current URL:', window.location.href);
  console.log('🔍 Current Path:', window.location.pathname);
  console.log('📋 Query String:', window.location.search);
  
  const params = new URLSearchParams(window.location.search);
  const account = params.get('acct1');
  const token = params.get('token1');
  const currency = params.get('cur1') || 'USD';

  console.log('🎫 Extracted params:', { account, token: token ? '***' + token.slice(-4) : null, currency });

  if (account && token) {
    console.log('✅ Valid tokens received - Storing auth data');
    localStorage.setItem('deriv_auth', JSON.stringify({
      account, token, currency, timestamp: Date.now()
    }));
    sessionStorage.setItem('auth_status', 'authenticated');
    sessionStorage.removeItem('oauth_attempt');
    
    console.log('🎯 Redirecting to dashboard...');
    window.location.href = '/dashboard';
    return true;
  } else {
    console.log('❌ No valid tokens found in callback');
    return false;
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