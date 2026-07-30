import { useState, useEffect } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import { handleCallback, isLoggedIn } from '../lib/finalAuth';

export default function Router() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    console.log('Router: path =', path, '| params =', params.toString());

    // Handle OAuth callback - could be /auth/callback or have code/state params
    const hasCode = params.has('code');
    const hasState = params.has('state');
    const isCallbackPath = path === '/auth/callback';

    if (isCallbackPath || (hasCode && hasState)) {
      console.log('Processing OAuth callback...');
      const success = handleCallback();
      if (!success) {
        // Callback failed - go to landing
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
        setLoading(false);
      }
      // If success, handleCallback will redirect to /dashboard
      return;
    }

    if (path === '/dashboard') {
      if (isLoggedIn()) {
        setShowDashboard(true);
      } else {
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
      }
    } else {
      if (isLoggedIn()) {
        window.history.replaceState({}, '', '/dashboard');
        setShowDashboard(true);
      } else {
        setShowDashboard(false);
      }
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading Auto Trend X...</p>
        </div>
      </div>
    );
  }

  return showDashboard ? <Dashboard /> : <App />;
}
