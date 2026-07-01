import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';

interface User {
  email: string;
  loginid: string;
  currency: string;
  balance: number;
}

function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#atx-grad)" />
      <rect x="8" y="20" width="4" height="8" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="9.5" y="16" width="1" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="9.5" y="28" width="1" height="2" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="16" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="17.5" y="8" width="1" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="17.5" y="22" width="1" height="3" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="24" y="16" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="25.5" y="12" width="1" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="25.5" y="23" width="1" height="2" rx="0.5" fill="white" fillOpacity="0.6" />
      <polyline points="10,22 18,14 26,18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" strokeDasharray="2 1.5" />
      <defs>
        <linearGradient id="atx-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading user data
    setTimeout(() => {
      setUser({
        email: 'trader@example.com',
        loginid: 'CR123456',
        currency: 'USD',
        balance: 1000.00
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    // Clear tokens and redirect to landing
    localStorage.removeItem('deriv_token');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Logo size={48} />
          <p className="mt-4 text-gray-600">Loading your trading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="font-bold text-gray-900">Auto Trend X</h1>
              <p className="text-xs text-gray-500">Trading Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {user?.currency} {user?.balance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">{user?.loginid}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Your Trading Workspace</h1>
          <p className="text-gray-600">Professional trading tools powered by Deriv</p>
        </div>

        {/* Trading Type Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'accumulators', label: 'Accumulators', desc: 'Growing stakes' },
            { id: 'bots', label: 'Trading Bots', desc: 'Automated strategies' },
            { id: 'risefall', label: 'Rise/Fall', desc: 'Simple trading' },
            { id: 'digits', label: 'Digits', desc: 'Number prediction' }
          ].map(tab => (
            <button
              key={tab.id}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-md text-sm font-medium transition-colors bg-white text-emerald-600 shadow-sm border-2 border-emerald-200"
            >
              <span>{tab.label}</span>
              <span className="text-xs text-gray-500">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Your Custom AutoTrend Bot App */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: '800px' }}>
          <iframe
            src="https://autotrendx-onyislos-projects.vercel.app"
            className="w-full h-full border-0"
            title="AutoTrend X Trading Bot"
            allow="camera; microphone; geolocation; fullscreen; payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          />
        </div>
      </div>
    </div>
  );
}