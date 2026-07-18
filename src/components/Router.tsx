import { useState, useEffect } from 'react';
import App from '../App';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import AdminDashboard from './AdminDashboard';
import { isAuthenticated } from '../lib/derivAuth';

// Secret control panel URL — not linked anywhere on the site
const ADMIN_PATH = '/cp-x7k2m9q';

export default function Router() {
  const [view, setView] = useState<'loading' | 'landing' | 'dashboard' | 'admin-login' | 'admin-dashboard'>('loading');

  useEffect(() => {
    const path = window.location.pathname;

    // Secret admin route
    if (path === ADMIN_PATH) {
      const hasSession = sessionStorage.getItem('atx_admin_session') === '1';
      setView(hasSession ? 'admin-dashboard' : 'admin-login');
      return;
    }

    if (path === '/dashboard') {
      if (isAuthenticated()) {
        setView('dashboard');
      } else {
        window.history.replaceState({}, '', '/');
        setView('landing');
      }
      return;
    }

    // Landing — auto-redirect if already logged in
    if (isAuthenticated()) {
      window.history.replaceState({}, '', '/dashboard');
      setView('dashboard');
    } else {
      setView('landing');
    }
  }, []);

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (view === 'admin-login') {
    return <AdminPanel onAuthenticated={() => setView('admin-dashboard')} />;
  }

  if (view === 'admin-dashboard') {
    return <AdminDashboard />;
  }

  return view === 'dashboard' ? <Dashboard /> : <App />;
}
