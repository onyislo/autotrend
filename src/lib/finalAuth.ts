// DERIV WEBSOCKET API APPROACH - MORE RELIABLE
const DERIV_APP_ID = '33LvvK8qit4Q2yXrRMiPAY';

export const loginWithDeriv = () => {
  // Instead of OAuth redirect, open Deriv in a popup and use postMessage
  const popup = window.open(
    `https://app.deriv.com/redirect?app_id=${DERIV_APP_ID}`,
    'derivAuth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  );

  // Listen for messages from the popup
  const messageListener = (event: MessageEvent) => {
    if (event.origin !== 'https://app.deriv.com') return;
    
    console.log('Received message from Deriv:', event.data);
    
    if (event.data && event.data.account && event.data.token) {
      // Store the auth data
      localStorage.setItem('deriv_auth', JSON.stringify({
        account: event.data.account,
        token: event.data.token,
        currency: event.data.currency || 'USD',
        timestamp: Date.now()
      }));
      
      sessionStorage.setItem('auth_status', 'authenticated');
      
      // Close popup and redirect
      popup?.close();
      window.removeEventListener('message', messageListener);
      window.location.href = '/dashboard';
    }
  };

  window.addEventListener('message', messageListener);
  
  // Fallback: if popup is closed manually, clean up
  const checkClosed = setInterval(() => {
    if (popup?.closed) {
      window.removeEventListener('message', messageListener);
      clearInterval(checkClosed);
    }
  }, 1000);
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