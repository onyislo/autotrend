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
    // Get real user data from auth
    const authData = localStorage.getItem('deriv_auth');
    if (authData) {
      try {
        const data = JSON.parse(authData);
        setUser({
          email: `${data.account}@deriv.com`,
          loginid: data.account,
          currency: data.currency,
          balance: 1000.00
        });
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('deriv_auth');
    sessionStorage.clear();
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

        {/* Trading Interface - EMBEDDED IN YOUR SYSTEM */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Your Trading Tools</h3>
            <p className="text-gray-600">Trade directly from your dashboard - No redirects!</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { 
                id: 'accumulators', 
                label: 'Accumulators', 
                icon: TrendingUp, 
                desc: 'Growing stakes trading'
              },
              { 
                id: 'digits', 
                label: 'Digits', 
                icon: Calculator, 
                desc: 'Number prediction trading'
              },
              { 
                id: 'bots', 
                label: 'Trading Bots', 
                icon: Bot, 
                desc: 'Automated trading strategies'
              },
              { 
                id: 'risefall', 
                label: 'Rise/Fall', 
                icon: BarChart3, 
                desc: 'Simple up/down trading'
              }
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTab(tool.id as any);
                }}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md text-left w-full ${
                  activeTab === tool.id
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-gray-200 hover:border-emerald-200'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <tool.icon size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{tool.label}</h4>
                  <p className="text-sm text-gray-500">{tool.desc}</p>
                </div>
                <div className="text-emerald-600">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M9 12l-4-4 4-4"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
          
          {/* EMBEDDED TRADING INTERFACE - NO REDIRECTS */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {activeTab === 'accumulators' && '📈 Accumulators Trading'}
              {activeTab === 'digits' && '🔢 Digits Trading'}
              {activeTab === 'bots' && '🤖 Bot Trading'}
              {activeTab === 'risefall' && '📊 Rise/Fall Trading'}
            </h4>
            
            {/* Trading Interface Container */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 min-h-[400px]">
              {activeTab === 'accumulators' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Accumulator Options</h5>
                    <div className="text-sm text-gray-500">Balance: {user?.currency} {user?.balance.toFixed(2)}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Market Selection</h6>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option>Volatility 75 Index</option>
                        <option>Volatility 100 Index</option>
                        <option>Crash 500 Index</option>
                        <option>Boom 1000 Index</option>
                      </select>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Stake Amount</h6>
                      <input 
                        type="number" 
                        placeholder="10.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Growth Rate</h6>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option>1%</option>
                        <option>2%</option>
                        <option>3%</option>
                        <option>5%</option>
                      </select>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Take Profit</h6>
                      <input 
                        type="number" 
                        placeholder="50.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors">
                      Start Accumulator
                    </button>
                    <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Reset
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'digits' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Digits Prediction</h5>
                    <div className="text-sm text-gray-500">Balance: {user?.currency} {user?.balance.toFixed(2)}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Market</h6>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option>Volatility 75 Index</option>
                        <option>Volatility 100 Index</option>
                      </select>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Stake</h6>
                      <input 
                        type="number" 
                        placeholder="10.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h6 className="font-medium text-gray-900 mb-3">Predict Last Digit</h6>
                    <div className="grid grid-cols-5 gap-2">
                      {[0,1,2,3,4,5,6,7,8,9].map(digit => (
                        <button 
                          key={digit}
                          className="p-3 border border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-center font-medium"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors">
                    Place Prediction
                  </button>
                </div>
              )}
              
              {activeTab === 'bots' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Trading Bot Setup</h5>
                    <div className="text-sm text-gray-500">Balance: {user?.currency} {user?.balance.toFixed(2)}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Bot Strategy</h6>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option>Martingale</option>
                        <option>D'Alembert</option>
                        <option>Oscar's Grind</option>
                        <option>Custom</option>
                      </select>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Initial Stake</h6>
                      <input 
                        type="number" 
                        placeholder="1.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Stop Loss</h6>
                      <input 
                        type="number" 
                        placeholder="50.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Take Profit</h6>
                      <input 
                        type="number" 
                        placeholder="100.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors">
                      Start Bot
                    </button>
                    <button className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
                      Stop Bot
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'risefall' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">Rise/Fall Trading</h5>
                    <div className="text-sm text-gray-500">Balance: {user?.currency} {user?.balance.toFixed(2)}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Market</h6>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option>Volatility 75 Index</option>
                        <option>Volatility 100 Index</option>
                        <option>EUR/USD</option>
                        <option>GBP/USD</option>
                      </select>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Stake Amount</h6>
                      <input 
                        type="number" 
                        placeholder="10.00" 
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Duration</h6>
                      <select className="w-full p-2 border border-gray-300 rounded-md">
                        <option>1 minute</option>
                        <option>5 minutes</option>
                        <option>15 minutes</option>
                        <option>1 hour</option>
                      </select>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Current Price</h6>
                      <div className="text-2xl font-bold text-gray-900">1.0542</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-lg transition-colors">
                      📈 RISE
                    </button>
                    <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-lg transition-colors">
                      📉 FALL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Advanced Trading Apps - Your Original Deriv Apps */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-3">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
              </svg>
              <span className="text-sm font-medium">🚀 Advanced Trading Apps (Your Original Deriv Apps)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {[
                { 
                  id: 'accumulators-advanced', 
                  label: 'Advanced Accumulators', 
                  icon: '📈',
                  url: 'https://autotrendx-onyislos-projects.vercel.app'
                },
                { 
                  id: 'digits-advanced', 
                  label: 'Advanced Digits', 
                  icon: '🔢',
                  url: 'https://autotrendx-onyislos-projects.vercel.app'
                },
                { 
                  id: 'bots-advanced', 
                  label: 'Advanced Bots', 
                  icon: '🤖',
                  url: 'https://autotrendx-onyislos-projects.vercel.app'
                },
                { 
                  id: 'risefall-advanced', 
                  label: 'Advanced Rise/Fall', 
                  icon: '📊',
                  url: 'https://autotrendx-onyislos-projects.vercel.app'
                }
              ].map(app => (
                <button
                  key={app.id}
                  onClick={() => {
                    // Get authentication data
                    const authData = localStorage.getItem('deriv_auth');
                    if (!authData) {
                      alert('Please login first to access advanced trading apps');
                      return;
                    }
                    
                    let auth;
                    try {
                      auth = JSON.parse(authData);
                    } catch (e) {
                      console.error('Error parsing auth data:', e);
                      alert('Authentication error. Please login again.');
                      return;
                    }
                    
                    // Open your original Deriv app in popup
                    const popup = window.open(
                      app.url,
                      `${app.id}_advanced`,
                      'width=1200,height=800,scrollbars=yes,resizable=yes,location=yes'
                    );
                    
                    if (popup) {
                      popup.focus();
                      console.log(`Opened advanced ${app.label} app`);
                    } else {
                      // Fallback if popups are blocked
                      if (confirm('Popups are blocked. Open in new tab instead?')) {
                        window.open(app.url, '_blank');
                      }
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all text-center"
                >
                  <div className="text-2xl">{app.icon}</div>
                  <div className="text-xs font-medium text-blue-700">{app.label}</div>
                </button>
              ))}
            </div>
            
            <div className="text-xs text-blue-600">
              <strong>🎯 Pro Features:</strong> Advanced charts, custom strategies, detailed analytics
              <br />
              <strong>💰 Revenue:</strong> These apps include your 3% markup and AutoTrend X branding
              <br />
              <strong>🔐 Auth:</strong> {user ? `Connected as ${user.loginid}` : 'Authentication required'}
            </div>
          </div>

          {/* Simple Trading vs Advanced Options */}
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
              </svg>
              <span className="text-sm font-medium">✅ DUAL SYSTEM: Embedded + Advanced Apps</span>
            </div>
            <div className="text-xs text-emerald-600">
              <strong>🟢 Simple Trading:</strong> Embedded interfaces above (stays on your site)
              <br />
              <strong>🔵 Advanced Trading:</strong> Your original Deriv apps (opens in popup with pro features)
              <br />
              <strong>💡 Best of Both:</strong> New users start simple, advanced users get pro tools
              <br />
              <button 
                onClick={() => {
                  console.log('=== AUTHENTICATION DEBUG ===');
                  console.log('Current URL:', window.location.href);
                  console.log('Auth Data:', localStorage.getItem('deriv_auth'));
                  console.log('Session Status:', sessionStorage.getItem('auth_status'));
                  console.log('User Object:', user);
                  
                  const params = new URLSearchParams(window.location.search);
                  console.log('URL Parameters:', params.toString());
                  console.log('Has acct1:', params.has('acct1'));
                  console.log('Has token1:', params.has('token1'));
                  
                  alert('Check console for debug info');
                }}
                className="mt-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
              >
                🔍 Debug Auth
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}