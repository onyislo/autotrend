import { useState, useEffect } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import { handleCallback, isLoggedIn } from '../lib/finalAuth';

export default function Router() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    console.log('Router: Current path:', currentPath);
    console.log('Router: URL params:', params.toString());
    
    // Handle OAuth callback specifically
    if (currentPath === '/auth/callback' || params.has('acct1') && params.has('token1')) {
      console.log('Processing Deriv OAuth callback...');
      const success = handleCallback();
      if (success) {
        console.log('Callback successful, redirecting to dashboard');
        // Redirect to dashboard after successful login
        window.history.replaceState({}, '', '/dashboard');
        setShowDashboard(true);
      } else {
        console.log('Callback failed, redirecting to home');
        // Failed login, go back to home
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
      }
      setLoading(false);
      return;
    }

    // Check if we're on dashboard URL
    if (currentPath === '/dashboard') {
      const loggedIn = isLoggedIn();
      console.log('On dashboard, logged in:', loggedIn);
      if (loggedIn) {
        setShowDashboard(true);
      } else {
        // Not logged in, redirect to home
        console.log('Not logged in, redirecting to home');
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
      }
    } else {
      // On landing page or other URLs
      const loggedIn = isLoggedIn();
      console.log('On landing page, logged in:', loggedIn);
      if (loggedIn && currentPath !== '/') {
        // Already logged in and not on home, go to dashboard
        console.log('Already logged in, redirecting to dashboard');
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