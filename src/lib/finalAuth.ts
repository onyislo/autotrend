// SIMPLE FIX - CORRECT OAUTH URL
const DERIV_APP_ID = '33LvvK8qit4Q2yXrRMiPAY';

export const loginWithDeriv = () => {
  // Correct OAuth URL - must use oauth.deriv.com, not home.deriv.com
  const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=en&brand=deriv&redirect_uri=https://autotrendx.qzz.io/auth/callback`;
  
  console.log('Redirecting to correct OAuth URL:', oauthUrl);
  window.location.href = oauthUrl;
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