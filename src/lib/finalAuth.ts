// FINAL AUTH SOLUTION - SIMPLE & WORKING
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33130Dyu0P9Lr05ZQ8Z9';

export const loginWithDeriv = () => {
  // Store that we want to go to dashboard after login
  sessionStorage.setItem('auth_intent', 'login');
  
  // Use environment-based callback URL
  const isDev = import.meta.env.DEV;
  const callbackUrl = isDev 
    ? (import.meta.env.VITE_CALLBACK_URL_DEV || 'http://localhost:5173/auth/callback')
    : (import.meta.env.VITE_CALLBACK_URL_PROD || 'https://autotrendx.qzz.io/auth/callback');
  
  console.log('Using callback URL:', callbackUrl);
  
  // Build OAuth URL with proper callback
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=en&brand=deriv&redirect_uri=${encodeURIComponent(callbackUrl)}`;
  
  console.log('Redirecting to:', oauthUrl);
  
  // Redirect to Deriv
  window.location.href = oauthUrl;
};

export const handleCallback = () => {
  const params = new URLSearchParams(window.location.search);
  const account = params.get('acct1');
  const token = params.get('token1');
  const currency = params.get('cur1') || 'USD';

  console.log('Callback params:', { account, token, currency });

  if (account && token) {
    // Save auth data
    const authData = {
      account,
      token,
      currency,
      timestamp: Date.now()
    };
    
    localStorage.setItem('deriv_auth', JSON.stringify(authData));
    sessionStorage.setItem('auth_status', 'authenticated');
    
    console.log('Authentication successful, saved data:', authData);
    
    // Clear URL parameters but keep the path
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.pathname);
    
    return true;
  }
  
  console.error('Authentication failed - missing account or token');
  return false;
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