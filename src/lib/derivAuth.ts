// Deriv OAuth Configuration
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089'; // Default demo app ID
const DERIV_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';

// Generate random state for OAuth security
const generateState = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Redirect to Deriv OAuth
export const loginWithDeriv = () => {
  const state = generateState();
  
  // Store state in localStorage for verification
  localStorage.setItem('oauth_state', state);
  
  // Build OAuth URL - Use the simpler approach
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'en',
    brand: 'deriv'
  });

  const oauthUrl = `${DERIV_OAUTH_URL}?${params.toString()}`;
  
  console.log('Redirecting to Deriv OAuth:', oauthUrl);
  
  // Redirect to Deriv OAuth
  window.location.href = oauthUrl;
};

// Handle OAuth callback
export const handleDerivCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for various possible parameter formats
  const accounts = urlParams.get('acct1') || urlParams.get('accounts');
  const token1 = urlParams.get('token1') || urlParams.get('token');
  const cur1 = urlParams.get('cur1') || urlParams.get('currency') || 'USD';
  
  console.log('OAuth callback params:', {
    accounts,
    token1: token1 ? 'present' : 'missing',
    currency: cur1,
    allParams: Object.fromEntries(urlParams.entries())
  });
  
  if (accounts && token1) {
    // Store auth data
    const authData = {
      account: accounts,
      token: token1,
      currency: cur1,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    
    console.log('Auth successful, redirecting to dashboard');
    
    // Clean URL and redirect to dashboard
    window.history.replaceState({}, '', '/dashboard');
    window.location.reload();
    
    return authData;
  }
  
  // If we don't have the required params, check if we're already on a callback URL
  if (window.location.pathname.includes('/auth/callback') || window.location.search.includes('acct')) {
    console.error('OAuth callback missing required parameters:', {
      url: window.location.href,
      params: Object.fromEntries(urlParams.entries())
    });
  }
  
  throw new Error('OAuth callback missing required parameters');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const authData = localStorage.getItem('deriv_auth');
  return authData !== null;
};

// Get user auth data
export const getAuthData = () => {
  const authData = localStorage.getItem('deriv_auth');
  return authData ? JSON.parse(authData) : null;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('deriv_auth');
  window.location.href = '/';
};

// Get trading token for API calls
export const getTradingToken = (): string | null => {
  const authData = getAuthData();
  return authData?.token || null;
};