import { useEffect, useState } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import { handleDerivCallback, isAuthenticated } from '../lib/derivAuth';

type Route = 'landing' | 'dashboard' | 'auth-callback';

export default function Router() {
  const [currentRoute, setCurrentRoute] = useState<Route>('landing');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;

    // Handle different routes
    if (path === '/auth/callback' || search.includes('acct1=')) {
      // OAuth callback from Deriv
      try {
        handleDerivCallback();
        setCurrentRoute('dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        // Redirect to landing with error
        window.history.replaceState({}, '', '/');
        setCurrentRoute('landing');
      }
    } else if (path === '/dashboard') {
      // Dashboard route
      if (isAuthenticated()) {
        setCurrentRoute('dashboard');
      } else {
        // Not authenticated, redirect to landing
        window.history.replaceState({}, '', '/');
        setCurrentRoute('landing');
      }
    } else {
      // Landing page (default)
      if (isAuthenticated()) {
        // Already authenticated, go to dashboard
        window.history.replaceState({}, '', '/dashboard');
        setCurrentRoute('dashboard');
      } else {
        setCurrentRoute('landing');
      }
    }

    setLoading(false);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      
      if (path === '/dashboard' && isAuthenticated()) {
        setCurrentRoute('dashboard');
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Render current route
  switch (currentRoute) {
    case 'dashboard':
      return <Dashboard />;
    case 'landing':
    default:
      return <App />;
  }
}