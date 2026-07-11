import { useState, useEffect } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import { isAuthenticated } from '../lib/derivAuth';

/**
 * Client-side router.
 *
 * The Deriv OAuth callback (/api/auth/callback) is handled entirely by the
 * Vercel serverless function. By the time the browser lands on /dashboard the
 * `deriv_session` cookie is already set, so we just check isAuthenticated().
 */
export default function Router() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/dashboard') {
      if (isAuthenticated()) {
        setShowDashboard(true);
      } else {
        // Not authenticated — go back to landing
        window.history.replaceState({}, '', '/');
        setShowDashboard(false);
      }
    } else {
      // Landing page: if already authenticated, jump straight to dashboard
      if (isAuthenticated()) {
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
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return showDashboard ? <Dashboard /> : <App />;
}
