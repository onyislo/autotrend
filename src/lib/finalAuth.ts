// CORRECT DERIV OAUTH FLOW - BASED ON DOCUMENTATION
const DERIV_APP_ID = '33LvvK8qit4Q2yXrRMiPAY';

export const loginWithDeriv = () => {
  // Use the documented OAuth flow with proper parameters
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'en',
    brand: 'deriv'
  });
  
  // Add redirect_uri separately to ensure proper encoding
  params.append('redirect_uri', 'https://autotrendx.qzz.io/auth/callback');
  
  const authUrl = `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
  
  console.log('🚀 Starting OAuth with URL:', authUrl);
  
  // Use location.assign instead of href for better compatibility
  window.location.assign(authUrl);
};

export const handleCallback = () => {
  console.log('🔐 Processing OAuth callback...');
  console.log('Current URL:', window.location.href);
  
  const urlParams = new URLSearchParams(window.location.search);
  const account = urlParams.get('acct1');
  const token = urlParams.get('token1');
  const currency = urlParams.get('cur1') || 'USD';
  
  console.log('Found tokens:', { account: !!account, token: !!token, currency });
  
  if (account && token) {
    console.log('✅ Storing authentication data...');
    
    const authData = {
      account,
      token, 
      currency,
      timestamp: Date.now()
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    sessionStorage.setItem('auth_status', 'authenticated');
    
    // Redirect to dashboard
    console.log('🎯 Redirecting to dashboard...');
    window.location.href = '/dashboard';
    return true;
  }
  
  console.log('❌ No valid authentication tokens found');
  return false;
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