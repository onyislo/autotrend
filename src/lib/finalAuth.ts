// SIMPLE FIX - JUST MAKE THE REDIRECT WORK
const DERIV_APP_ID = '33130Dyu0P9Lr05ZQ8Z9';

export const loginWithDeriv = () => {
  // Simple redirect with explicit callback
  window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=en&brand=deriv&redirect_uri=https://autotrendx.qzz.io/auth/callback`;
};

export const handleCallback = () => {
  const params = new URLSearchParams(window.location.search);
  const account = params.get('acct1');
  const token = params.get('token1');
  const currency = params.get('cur1') || 'USD';

  if (account && token) {
    localStorage.setItem('deriv_auth', JSON.stringify({
      account, token, currency, timestamp: Date.now()
    }));
    sessionStorage.setItem('auth_status', 'authenticated');
    window.location.href = '/dashboard';
    return true;
  }
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