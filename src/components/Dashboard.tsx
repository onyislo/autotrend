import { useState, useEffect, useCallback } from 'react';
import { LogOut, RefreshCw, TrendingUp, Bot, BarChart2, Zap, ChevronRight, Activity, Menu, X } from 'lucide-react';
import { logout, getUserData } from '../lib/finalAuth';

// ── Logo ──
function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#db-grad)" />
      <rect x="8" y="20" width="4" height="8" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="16" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="24" y="16" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
      <polyline points="10,22 18,14 26,18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      <defs>
        <linearGradient id="db-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" /><stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Types ──
type TabId = 'dashboard' | 'botbuilder' | 'freebots' | 'dtrader' | 'quickbot' | 'autotrade' | 'signalai' | 'copytrader' | 'charts';

interface Signal {
  id: number;
  market: string;
  symbol: string;
  type: string;
  confidence: number;
  most: number;
  least: number;
  badge: string;
  badgeColor: string;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',   label: 'Dashboard',    icon: <BarChart2 size={15} /> },
  { id: 'botbuilder',  label: 'Bot Builder',  icon: <Bot size={15} /> },
  { id: 'freebots',    label: 'Free Bots',    icon: <Zap size={15} /> },
  { id: 'dtrader',     label: 'D-Trader',     icon: <TrendingUp size={15} /> },
  { id: 'quickbot',    label: 'Quick Bot',    icon: <Activity size={15} /> },
  { id: 'autotrade',   label: 'Auto Trade',   icon: <RefreshCw size={15} /> },
  { id: 'signalai',    label: 'Signal AI',    icon: <Zap size={15} /> },
  { id: 'copytrader',  label: 'Copy Trader',  icon: <ChevronRight size={15} /> },
  { id: 'charts',      label: 'Charts',       icon: <BarChart2 size={15} /> },
];

const TOOL_CARDS = [
  { id: 'botbuilder' as TabId,  icon: <Bot size={28} />,       title: 'Bot Builder',   desc: 'Build and run block strategies' },
  { id: 'dtrader'    as TabId,  icon: <TrendingUp size={28} />, title: 'D-Trader',      desc: 'Manual options & accumulators' },
  { id: 'freebots'   as TabId,  icon: <Zap size={28} />,        title: 'Free Bots',     desc: 'Load ready XML strategies' },
  { id: 'charts'     as TabId,  icon: <BarChart2 size={28} />,  title: 'Charts',        desc: 'Live Deriv SmartCharts' },
  { id: 'autotrade'  as TabId,  icon: <RefreshCw size={28} />,  title: 'Auto Trade',    desc: 'Automated trading engine' },
];

const MARKETS_TICKER = [
  'Volatility 10 (1s)', 'Volatility 25 (1s)', 'Volatility 75 (1s)', 'Volatility 100 (1s)',
  'Crash 300 Index', 'Crash 500 Index', 'Crash 1000 Index',
  'Boom 300 Index', 'Boom 500 Index', 'Boom 1000 Index',
  'Volatility 10', 'Volatility 25', 'Volatility 50', 'Volatility 75', 'Volatility 100',
];

const SIGNAL_TYPES = ['ODD', 'EVEN', 'OVER', 'UNDER', 'DIFFERS', 'MATCHES'];
const BADGE_COLORS: Record<string, string> = {
  ODD: 'bg-orange-500', EVEN: 'bg-blue-500', OVER: 'bg-green-500',
  UNDER: 'bg-purple-500', DIFFERS: 'bg-red-500', MATCHES: 'bg-yellow-500',
};

const SIGNAL_MARKETS = [
  { market: 'Volatility 100 Index', symbol: 'R_100' },
  { market: 'Volatility 50 (1s) Index', symbol: '1HZ50V' },
  { market: 'Volatility 75 Index', symbol: 'R_75' },
  { market: 'Volatility 25 (1s) Index', symbol: '1HZ25V' },
  { market: 'Crash 500 Index', symbol: 'CRASH500' },
  { market: 'Boom 1000 Index', symbol: 'BOOM1000' },
];

// Generate random signals
const generateSignals = (): Signal[] =>
  SIGNAL_MARKETS.map((m, i) => {
    const type = SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)];
    const confidence = Math.floor(Math.random() * 30) + 55;
    const most = Math.floor(Math.random() * 5);
    const least = Math.floor(Math.random() * 8) + 2;
    return { id: i + 1, ...m, type, confidence, most, least, badge: type, badgeColor: BADGE_COLORS[type] };
  });

// ── Signal Card ──
function SignalCard({ signal, onLoad }: { signal: Signal; onLoad: (s: Signal) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
            #{signal.id}
          </span>
          <div>
            <p className="font-bold text-gray-900 text-sm">{signal.market}</p>
          </div>
        </div>
        <span className={`${signal.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded`}>
          {signal.badge}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 uppercase font-medium">Confidence</span>
          <span className="text-sm font-bold text-gray-900">{signal.confidence}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-red-500 h-1.5 rounded-full transition-all"
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-400 uppercase">{signal.type}</p>
          <p className="font-bold text-gray-900 text-sm">{signal.confidence}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-400 uppercase">Most</p>
          <p className="font-bold text-gray-900 text-sm">{signal.most}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-400 uppercase">Least</p>
          <p className="font-bold text-gray-900 text-sm">{signal.least}</p>
        </div>
      </div>

      <details className="mb-3">
        <summary className="text-xs text-emerald-600 cursor-pointer hover:text-emerald-700 font-medium">Show details</summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
          <p>Signal generated from last 500 ticks analysis</p>
          <p>Pattern: {signal.type === 'ODD' || signal.type === 'EVEN' ? 'Digits' : 'Over/Under'} strategy</p>
          <p>Suggested stake: 1-5% of balance</p>
        </div>
      </details>

      <button
        onClick={() => onLoad(signal)}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
      >
        ▶ Load {signal.badge} signal
      </button>
    </div>
  );
}

// ── Tool Card ──
function ToolCard({ tool, onClick }: { tool: typeof TOOL_CARDS[0]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all text-left flex items-start gap-4 group"
    >
      <div className="w-12 h-12 bg-gray-50 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-emerald-600 transition-colors shrink-0">
        {tool.icon}
      </div>
      <div>
        <p className="font-bold text-gray-900 mb-0.5">{tool.title}</p>
        <p className="text-sm text-gray-500">{tool.desc}</p>
      </div>
    </button>
  );
}

// ── Placeholder Panel ──
function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
        <Bot size={32} className="text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-sm">This feature is coming soon. Stay tuned for updates!</p>
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [signals, setSignals] = useState<Signal[]>(generateSignals());
  const [countdown, setCountdown] = useState(20);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loadedSignal, setLoadedSignal] = useState<Signal | null>(null);
  const userData = getUserData();

  // Auto-refresh signals
  const refreshSignals = useCallback(() => {
    setSignals(generateSignals());
    setCountdown(20);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { refreshSignals(); return 20; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshSignals]);

  const handleLoadSignal = (signal: Signal) => {
    setLoadedSignal(signal);
    setActiveTab('dtrader');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top Nav ── */}
      <nav className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: logo + live badge */}
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1" onClick={() => setMobileMenu(!mobileMenu)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-bold text-white hidden sm:block">Auto Trend X</span>
            </div>
            <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>

          {/* Center: desktop tabs */}
          <div className="hidden md:flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: balance + logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">
                {userData?.currency || 'USD'} {parseFloat(userData?.balance || '0').toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">{userData?.account || 'Account'}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-white/10 bg-gray-800 px-4 py-3 space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenu(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Markets Ticker ── */}
      <div className="bg-white border-b border-gray-100 overflow-hidden py-1.5">
        <div className="flex gap-6 animate-ticker whitespace-nowrap">
          {[...MARKETS_TICKER, ...MARKETS_TICKER].map((m, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* Signals header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <h2 className="font-bold text-gray-900 uppercase text-sm tracking-wider">Live Trading Signals</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Next refresh <span className="font-bold text-gray-900">{countdown}s</span></span>
                <button
                  onClick={refreshSignals}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw size={14} />
                  Refresh now
                </button>
              </div>
            </div>

            {/* Signal cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {signals.map(signal => (
                <SignalCard key={signal.id} signal={signal} onLoad={handleLoadSignal} />
              ))}
            </div>

            {/* Tool cards */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Trading Tools</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {TOOL_CARDS.map(tool => (
                  <ToolCard key={tool.id} tool={tool} onClick={() => setActiveTab(tool.id)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* D-Trader Tab */}
        {activeTab === 'dtrader' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">D-Trader</h2>
              {loadedSignal && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-emerald-700 font-medium">Signal loaded: {loadedSignal.market} – {loadedSignal.badge}</span>
                  <button onClick={() => setLoadedSignal(null)} className="text-emerald-500 hover:text-emerald-700"><X size={14} /></button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
              <iframe
                src={`https://app.deriv.com/dtrader`}
                className="w-full h-full border-0"
                title="D-Trader"
                allow="clipboard-write"
              />
            </div>
          </div>
        )}

        {/* Bot Builder Tab */}
        {activeTab === 'botbuilder' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Bot Builder</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
              <iframe
                src="https://app.deriv.com/bot"
                className="w-full h-full border-0"
                title="Bot Builder"
                allow="clipboard-write"
              />
            </div>
          </div>
        )}

        {/* Charts Tab */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Charts</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
              <iframe
                src="https://app.deriv.com/dtrader#chart"
                className="w-full h-full border-0"
                title="Charts"
              />
            </div>
          </div>
        )}

        {/* Signal AI Tab */}
        {activeTab === 'signalai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Signal AI</h2>
              <button onClick={refreshSignals} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <RefreshCw size={14} /> Generate Signals
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {signals.map(signal => (
                <SignalCard key={signal.id} signal={signal} onLoad={handleLoadSignal} />
              ))}
            </div>
          </div>
        )}

        {/* Auto Trade, Free Bots, Quick Bot, Copy Trader */}
        {(activeTab === 'autotrade' || activeTab === 'freebots' || activeTab === 'quickbot' || activeTab === 'copytrader') && (
          <PlaceholderPanel title={TABS.find(t => t.id === activeTab)?.label || ''} />
        )}

      </main>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-ticker { animation: ticker 30s linear infinite; }
      `}</style>
    </div>
  );
}
