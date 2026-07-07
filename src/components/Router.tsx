import { useState, useEffect } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import { handleCallback, isLoggedIn } from '../lib/finalAuth';

export default function Router() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    const params = new URLSearchParams(window.location.search);
    
    console.log('🔄 Router: Analyzing current location...');
    console.log('📍 Path:', currentPath);
    console.log('🔗 Full URL:', currentUrl);
    console.log('📋 Params:', params.toString());
    
    // CRITICAL: Check if this is a Deriv OAuth callback
    const hasCallbackParams = params.has('acct1') && params.has('token1');
    const isCallbackPath = currentPath === '/auth/callback';
    
    // Also check if we're already on autotrendx.qzz.io with callback params
    const isOnOurSiteWithTokens = currentUrl.includes('autotrendx.qzz.io') && hasCallbackParams;
    
    const isCallback = hasCallbackParams || isCallbackPath || isOnOurSiteWithTokens;
    
    if (isCallback) {
      console.log('🔐 DETECTED: OAuth callback - Processing REAL authentication...');
      const success = handleCallback();
      
      if (success) {
        console.log('✅ REAL Callback SUCCESS - Redirecting to dashboard');
        // Force clean redirect to dashboard
        const dashboardUrl = window.location.origin + '/dashboard';
        window.location.replace(dashboardUrl);
        return;
      } else {
        console.log('❌ Callback FAILED - Redirecting to home');
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
      }
      setLoading(false);
      return;
    }

    // Check if we're trying to access dashboard
    if (currentPath === '/dashboard') {
      const loggedIn = isLoggedIn();
      console.log('📊 Dashboard access check - Logged in:', loggedIn);
      
      if (loggedIn) {
        console.log('✅ User authenticated - Showing dashboard');
        setShowDashboard(true);
      } else {
        console.log('❌ Not authenticated - Redirecting to home');
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
      }
    } else {
      // On landing page or other URLs
      const loggedIn = isLoggedIn();
      console.log('🏠 Landing page - Logged in:', loggedIn);
      
      if (loggedIn && currentPath === '/') {
        console.log('✅ Already authenticated - Auto-redirect to dashboard');
        window.history.replaceState({}, '', '/dashboard');
        setShowDashboard(true);
      } else {
        console.log('🏠 Staying on landing page');
        setShowDashboard(false);
      }
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return showDashboard ? <Dashboard /> : <App />;
}