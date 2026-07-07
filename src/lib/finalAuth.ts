// DERIV OAUTH - MANUAL REDIRECT SOLUTION
const DERIV_APP_ID = '33LvvK8qit4Q2yXrRMiPAY';

export const loginWithDeriv = () => {
  // Method 1: Direct OAuth (what we've been trying)
  const directOAuth = () => {
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=en&brand=deriv&redirect_uri=https://autotrendx.qzz.io/auth/callback`;
    console.log('🔄 Trying direct OAuth:', oauthUrl);
    window.location.href = oauthUrl;
  };

  // Method 2: Alternative - Use Deriv's app registration flow
  const alternativeFlow = () => {
    const appUrl = `https://app.deriv.com/redirect?app_id=${DERIV_APP_ID}&redirect_uri=https://autotrendx.qzz.io/auth/callback`;
    console.log('🔄 Trying alternative flow:', appUrl);
    window.location.href = appUrl;
  };

  // Method 3: Force redirect with explicit parameters
  const forceRedirect = () => {
    const params = {
      app_id: DERIV_APP_ID,
      l: 'en',
      brand: 'deriv',
      redirect_uri: 'https://autotrendx.qzz.io/auth/callback',
      response_type: 'token'  // Changed to token instead of code
    };
    
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const url = `https://oauth.deriv.com/oauth2/authorize?${queryString}`;
    console.log('🔄 Force redirect URL:', url);
    
    // Open in same window with replace to avoid back button issues
    window.location.replace(url);
  };

  console.log('🚀 Starting Deriv login with force redirect...');
  forceRedirect();
};

export const handleCallback = () => {
  console.log('🔐 Callback handler triggered!');
  console.log('📍 Current URL:', window.location.href);
  console.log('🔍 Current Path:', window.location.pathname);
  console.log('📋 Query String:', window.location.search);
  console.log('🔗 Hash Fragment:', window.location.hash);
  
  // Check URL params first (traditional method)
  const params = new URLSearchParams(window.location.search);
  let account = params.get('acct1');
  let token = params.get('token1');
  let currency = params.get('cur1') || 'USD';

  // If no params in query string, check hash fragment (for token response_type)
  if (!account || !token) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    account = hashParams.get('acct1') || account;
    token = hashParams.get('token1') || token;
    currency = hashParams.get('cur1') || currency || 'USD';
  }

  console.log('🎫 Extracted params:', { 
    account, 
    token: token ? '***' + token.slice(-4) : null, 
    currency,
    source: params.get('acct1') ? 'query' : 'hash'
  });

  if (account && token) {
    console.log('✅ Valid tokens received - Storing auth data');
    localStorage.setItem('deriv_auth', JSON.stringify({
      account, token, currency, timestamp: Date.now()
    }));
    sessionStorage.setItem('auth_status', 'authenticated');
    sessionStorage.removeItem('oauth_attempt');
    
    console.log('🎯 Redirecting to dashboard...');
    // Clean the URL and redirect
    window.history.replaceState({}, '', '/dashboard');
    window.location.reload();
    return true;
  } else {
    console.log('❌ No valid tokens found in callback');
    console.log('🔍 Available query params:', Array.from(params.entries()));
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      console.log('🔍 Available hash params:', Array.from(hashParams.entries()));
    }
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