import { useState, useEffect } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import AdminRoute from './AdminRoute';
import { handleCallback, isLoggedIn } from '../lib/finalAuth';

export default function Router() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.pathname === '/5678-hekaya');
  const [loading, setLoading] = useState(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    return path === '/auth/callback' || params.has('code') || params.has('error');
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    console.log('Router: path =', path);

    if (path === '/5678-hekaya') {
      setIsAdminRoute(true);
      setLoading(false);
      return;
    }

    const isCallbackPath = path === '/auth/callback';
    const hasCode = params.has('code');
    const hasError = params.has('error') || params.has('error_description');
    const isDerivError = params.get('error') === 'missing_params' || params.has('error');

    if (isCallbackPath || hasCode || hasError || isDerivError) {
      console.log('Processing OAuth callback...');

      if (hasError) {
        const errDesc = params.get('error_description') || 'Authentication failed';
        setError(errDesc);
        setLoading(false);
        return;
      }

      // handleCallback is async - must await it
      handleCallback().then((success) => {
        if (!success) {
          setError('Login failed. Please try again.');
          setLoading(false);
        }
        // If success, handleCallback redirects to /dashboard
      });
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

  if (isAdminRoute) {
    return <AdminRoute />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Connecting to Deriv...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Login Failed</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return showDashboard ? <Dashboard /> : <App />;
}
