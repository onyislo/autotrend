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
  
  // Build OAuth URL
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'en',
    brand: 'deriv',
    date_first_contact: new Date().toISOString().split('T')[0],
    signup_device: 'desktop',
    utm_source: 'autotrend-x',
    utm_medium: 'referral',
    utm_campaign: 'signup',
    state: state
  });

  const oauthUrl = `${DERIV_OAUTH_URL}?${params.toString()}`;
  
  // Redirect to Deriv OAuth
  window.location.href = oauthUrl;
};

// Handle OAuth callback
export const handleDerivCallback = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accounts = urlParams.get('acct1');
  const token1 = urlParams.get('token1');
  const cur1 = urlParams.get('cur1');
  const state = urlParams.get('state');
  
  // Verify state
  const storedState = localStorage.getItem('oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid OAuth state');
  }
  
  // Clean up state
  localStorage.removeItem('oauth_state');
  
  if (accounts && token1) {
    // Store auth data
    const authData = {
      account: accounts,
      token: token1,
      currency: cur1 || 'USD',
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
    
    return authData;
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