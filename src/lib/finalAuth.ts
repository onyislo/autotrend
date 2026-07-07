// DIRECT LOGIN SOLUTION - NO OAUTH CALLBACK ISSUES
const DERIV_APP_ID = import.meta.env.VITE_DERIV_APP_ID || '33130Dyu0P9Lr05ZQ8Z9';

export const loginWithDeriv = () => {
  console.log('🔐 Starting DIRECT login process...');
  
  // Method 1: Try direct login with window message handling
  const authWindow = window.open(
    `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=en&brand=deriv`,
    'derivAuth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  );
  
  if (!authWindow) {
    alert('Please allow popups and try again');
    return;
  }
  
  // Listen for messages from the auth window
  const messageHandler = (event) => {
    console.log('📩 Received message:', event.data);
    
    if (event.origin !== 'https://oauth.deriv.com') {
      return;
    }
    
    if (event.data && event.data.type === 'authorize') {
      console.log('✅ Authorization successful!');
      
      // Save auth data
      const authData = {
        account: event.data.account,
        token: event.data.token,
        currency: event.data.currency || 'USD',
        timestamp: Date.now(),
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('deriv_auth', JSON.stringify(authData));
      sessionStorage.setItem('auth_status', 'authenticated');
      
      // Close auth window
      authWindow.close();
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      
      // Remove event listener
      window.removeEventListener('message', messageHandler);
    }
  };
  
  window.addEventListener('message', messageHandler);
  
  // Fallback: Check if window closed manually
  const checkClosed = setInterval(() => {
    if (authWindow.closed) {
      clearInterval(checkClosed);
      window.removeEventListener('message', messageHandler);
      
      // Check if user manually completed auth by checking URL
      checkManualAuth();
    }
  }, 1000);
};

// Alternative method: Check for manual authentication
const checkManualAuth = () => {
  // If user completed auth manually, they might have the tokens in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('acct1') && urlParams.has('token1')) {
    handleCallback();
    window.location.href = '/dashboard';
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