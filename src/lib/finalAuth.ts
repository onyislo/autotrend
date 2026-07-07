// REAL DERIV LOGIN - NO DEMO, NO REDIRECT ISSUES
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33130Dyu0P9Lr05ZQ8Z9';

export const loginWithDeriv = () => {
  console.log('🔐 Starting REAL Deriv login...');
  
  // Build the OAuth URL with correct callback
  const isDev = window.location.hostname === 'localhost';
  const callbackUrl = isDev 
    ? 'http://localhost:5173/auth/callback'
    : 'https://autotrendx.qzz.io/auth/callback';
  
  const oauthParams = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'en',
    brand: 'deriv',
    redirect_uri: callbackUrl
  });
  
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?${oauthParams.toString()}`;
  
  console.log('🔗 OAuth URL:', oauthUrl);
  console.log('📍 Callback URL:', callbackUrl);
  
  // Direct redirect to Deriv (this should work with your configured callback URL)
  window.location.href = oauthUrl;
};

export const handleCallback = () => {
  console.log('🔄 Processing REAL Deriv callback...');
  console.log('📍 Current URL:', window.location.href);
  
  const params = new URLSearchParams(window.location.search);
  const account = params.get('acct1');
  const token = params.get('token1');
  const currency = params.get('cur1') || 'USD';

  console.log('📋 Callback params:', { 
    account: account || 'MISSING', 
    token: token ? 'PRESENT' : 'MISSING', 
    currency 
  });

  if (account && token) {
    // Save REAL auth data
    const authData = {
      account,
      token,
      currency,
      timestamp: Date.now(),
      loginTime: new Date().toISOString(),
      isRealAccount: true
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    sessionStorage.setItem('auth_status', 'authenticated');
    
    console.log('✅ REAL Authentication successful!');
    console.log('💾 Saved REAL auth data for account:', account);
    
    return true;
  } else {
    console.error('❌ REAL Authentication failed - Missing required parameters');
    return false;
  }
};

export const handleCallback = () => {
  console.log('🔄 Processing callback...');
  console.log('📍 Current URL:', window.location.href);
  
  const params = new URLSearchParams(window.location.search);
  const account = params.get('acct1');
  const token = params.get('token1');
  const currency = params.get('cur1') || 'USD';

  console.log('📋 Callback params:', { 
    account: account || 'MISSING', 
    token: token ? 'PRESENT' : 'MISSING', 
    currency 
  });

  if (account && token) {
    // Save auth data
    const authData = {
      account,
      token,
      currency,
      timestamp: Date.now(),
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    sessionStorage.setItem('auth_status', 'authenticated');
    
    console.log('✅ Authentication successful!');
    console.log('💾 Saved auth data for account:', account);
    
    // Clear URL parameters and ensure we're on the right path
    const cleanUrl = window.location.origin + '/dashboard';
    window.history.replaceState({}, 'Dashboard', cleanUrl);
    
    return true;
  } else {
    console.error('❌ Authentication failed - Missing required parameters');
    return false;
  }
};

export const isLoggedIn = (): boolean => {
  // Check session first (faster)
  if (sessionStorage.getItem('auth_status') === 'authenticated') {
    return true;
  }
  
  // Check localStorage
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
  sessionStorage.removeItem('auth_intent');
  window.location.href = '/';
};