// DERIV OAUTH - using legacy endpoint which works with developers.deriv.com apps
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33LvvK8qit4Q2yXrRMiPAY';

export const loginWithDeriv = () => {
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: 'en',
    brand: 'deriv',
    redirect_uri: 'https://autotrendx.qzz.io/auth/callback'
  });

  const authUrl = `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
  console.log('🚀 OAuth URL:', authUrl);
  window.location.href = authUrl;
};

export const handleCallback = () => {
  console.log('🔐 Callback URL:', window.location.href);

  const urlParams = new URLSearchParams(window.location.search);
  const account = urlParams.get('acct1');
  const token   = urlParams.get('token1');
  const currency = urlParams.get('cur1') || 'USD';

  if (account && token) {
    localStorage.setItem('deriv_auth', JSON.stringify({
      account, token, currency, timestamp: Date.now()
    }));
    sessionStorage.setItem('auth_status', 'authenticated');
    console.log('✅ Auth stored, redirecting to dashboard...');
    window.location.href = '/dashboard';
    return true;
  }

  console.log('❌ No tokens found in callback');
  return false;
};

export const isLoggedIn = (): boolean => {
  if (sessionStorage.getItem('auth_status') === 'authenticated') return true;
  const authData = localStorage.getItem('deriv_auth');
  if (authData) {
    sessionStorage.setItem('auth_status', 'authenticated');
    return true;
  }
  return false;
};

export const getUserData = () => {
  try {
    const data = localStorage.getItem('deriv_auth');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('deriv_auth');
  sessionStorage.removeItem('auth_status');
  window.location.href = '/';
};
