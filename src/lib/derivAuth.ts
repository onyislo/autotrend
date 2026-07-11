// Simple Deriv OAuth - WORKING VERSION
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33MJcHX2yZOr6lkeIP9Mg';

// Redirect to Deriv OAuth
export const loginWithDeriv = () => {
  const currentUrl = window.location.origin;
  const redirectUri = currentUrl.includes('localhost') 
    ? 'http://localhost:5173/api/auth/callback' 
    : 'https://autotrendx.qzz.io/api/auth/callback';
    
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=en&brand=deriv&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  // Store where we came from
  localStorage.setItem('deriv_return_url', `${currentUrl}/dashboard`);
  
  console.log('Redirecting to:', oauthUrl);
  window.location.href = oauthUrl;
};

// Handle OAuth callback - SIMPLE VERSION
export const handleDerivCallback = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  
  // Get tokens from URL parameters
  const account = params.get('acct1') || params.get('account');
  const token = params.get('token1') || params.get('token');
  const currency = params.get('cur1') || params.get('currency') || 'USD';
  
  console.log('Callback params:', { account, token: token ? 'present' : 'missing' });
  
  if (account && token) {
    // Save auth data
    const authData = {
      account,
      token,
      currency,
      loginTime: Date.now()
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    
    // Redirect to dashboard
    const returnUrl = localStorage.getItem('deriv_return_url') || '/dashboard';
    localStorage.removeItem('deriv_return_url');
    
    window.location.href = returnUrl;
    return authData;
  }
  
  // If no tokens, we might be on a callback URL but without proper params
  if (url.pathname.includes('dashboard') || url.search.includes('acct')) {
    console.log('On callback URL but missing tokens - redirecting to landing');
    window.location.href = '/';
    return null;
  }
  
  return null;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const authData = localStorage.getItem('deriv_auth');
  if (!authData) return false;
  
  try {
    const data = JSON.parse(authData);
    // Check if token is less than 24 hours old
    const isValid = data.token && (Date.now() - data.loginTime < 24 * 60 * 60 * 1000);
    if (!isValid) {
      localStorage.removeItem('deriv_auth');
    }
    return isValid;
  } catch {
    localStorage.removeItem('deriv_auth');
    return false;
  }
};

// Get user auth data
export const getAuthData = () => {
  const authData = localStorage.getItem('deriv_auth');
  return authData ? JSON.parse(authData) : null;
};

// Logout user
export const logout = () => {
  localStorage.removeItem('deriv_auth');
  localStorage.removeItem('deriv_return_url');
  window.location.href = '/';
};

// Get trading token for API calls
export const getTradingToken = (): string | null => {
  const authData = getAuthData();
  return authData?.token || null;
};