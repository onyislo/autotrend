import { useState, useEffect } from 'react';
import { LogOut, Menu, X, BarChart3, Bot, Calculator, TrendingUp } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'accumulators' | 'digits' | 'bots' | 'risefall'>('accumulators');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-600 hover:text-gray-900 p-1"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            <Logo size={32} />
            <div>
              <h1 className="font-bold text-gray-900">Auto Trend X</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Trading Dashboard</p>
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Logo size={28} />
                <span className="font-bold text-gray-900">Auto Trend X</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Trading Types Navigation */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Trading Tools</h3>
              <div className="space-y-2">
                {[
                  { id: 'accumulators', label: 'Accumulators', icon: TrendingUp, desc: 'Growing stakes' },
                  { id: 'digits', label: 'Digits', icon: Calculator, desc: 'Number prediction' },
                  { id: 'bots', label: 'Trading Bots', icon: Bot, desc: 'Automated trading' },
                  { id: 'risefall', label: 'Rise/Fall', icon: BarChart3, desc: 'Simple trading' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon size={20} />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500">{tab.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* User Info in Drawer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.currency} {user?.balance.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">{user?.loginid}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Desktop Tabs - Hidden on Mobile */}
        <div className="hidden md:flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'accumulators', label: 'Accumulators', icon: TrendingUp, desc: 'Growing stakes' },
            { id: 'digits', label: 'Digits', icon: Calculator, desc: 'Number prediction' },
            { id: 'bots', label: 'Trading Bots', icon: Bot, desc: 'Automated trading' },
            { id: 'risefall', label: 'Rise/Fall', icon: BarChart3, desc: 'Simple trading' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-600 shadow-sm border border-emerald-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={16} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div className="text-xs text-gray-400">{tab.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile Active Tab Indicator */}
        <div className="md:hidden mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            {activeTab === 'accumulators' && <TrendingUp size={16} className="text-emerald-600" />}
            {activeTab === 'digits' && <Calculator size={16} className="text-emerald-600" />}
            {activeTab === 'bots' && <Bot size={16} className="text-emerald-600" />}
            {activeTab === 'risefall' && <BarChart3 size={16} className="text-emerald-600" />}
            <span className="font-medium text-gray-900">
              {activeTab === 'accumulators' && 'Accumulators Trading'}
              {activeTab === 'digits' && 'Digits Trading'}
              {activeTab === 'bots' && 'Bot Trading'}
              {activeTab === 'risefall' && 'Rise/Fall Trading'}
            </span>
          </div>
        </div>

        {/* Trading App Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: '800px' }}>
          <iframe
            src="https://autotrendx-onyislos-projects.vercel.app"
            className="w-full h-full border-0"
            title={`AutoTrend X ${activeTab} Trading`}
            allow="camera; microphone; geolocation; fullscreen; payment"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          />
        </div>
      </div>
    </div>
  );
}