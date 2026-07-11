import { useState, useEffect } from 'react';
import { LogOut, Menu, X, TrendingUp, Calculator, Bot, BarChart3 } from 'lucide-react';
import { logout } from '../lib/derivAuth';
import DerivLiveChart from './DerivLiveChart';
import DerivAppLauncher from './DerivAppLauncher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Account {
  account_id?: string;
  account_type?: string;
  balance?: number | string;
  currency?: string;
  loginid?: string;
}

interface MeResponse {
  accounts: Account[];
  wsToken: string | null;
  wsUrl: string | null;
  accountId: string | null;
}

type MainTab = 'markets' | 'accumulators' | 'digits' | 'bot' | 'risefall';

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------
function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#atx-grad-db)" />
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
        <linearGradient id="atx-grad-db" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Markets for the live chart tab
// ---------------------------------------------------------------------------
const MARKETS = [
  { symbol: 'R_10',      label: 'Volatility 10' },
  { symbol: 'R_25',      label: 'Volatility 25' },
  { symbol: 'R_50',      label: 'Volatility 50' },
  { symbol: 'R_75',      label: 'Volatility 75' },
  { symbol: 'R_100',     label: 'Volatility 100' },
  { symbol: 'CRASH300N', label: 'Crash 300' },
  { symbol: 'BOOM300N',  label: 'Boom 300' },
  { symbol: 'JD10',      label: 'Jump 10' },
];

// ---------------------------------------------------------------------------
// Main tabs (sidebar on desktop, bottom bar on mobile)
// ---------------------------------------------------------------------------
const MAIN_TABS = [
  { id: 'markets'      as MainTab, label: 'Live Markets',   icon: BarChart3  },
  { id: 'accumulators' as MainTab, label: 'Accumulators',   icon: TrendingUp },
  { id: 'digits'       as MainTab, label: 'Digits',         icon: Calculator },
  { id: 'bot'          as MainTab, label: 'Bot Builder',    icon: Bot        },
  { id: 'risefall'     as MainTab, label: 'Rise / Fall',    icon: BarChart3  },
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop sidebar collapse
  const [activeTab, setActiveTab] = useState<MainTab>('markets');
  const [activeChart, setActiveChart] = useState(MARKETS[0].symbol);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: MeResponse) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const realAccount = session?.accounts.find((a) => a.account_type !== 'demo');
  const demoAccount = session?.accounts.find((a) => a.account_type === 'demo');
  const currentAccount =
    session?.accounts.find((a) => a.account_id === session.accountId) ??
    realAccount ??
    session?.accounts[0];

  const fmt = (val: number | string | undefined) =>
    val !== undefined ? Number(val).toFixed(2) : '—';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Logo size={48} />
          <p className="mt-4 text-gray-500">Loading your trading workspace…</p>
        </div>
      </div>
    );
  }

  const activeMarket = MARKETS.find((m) => m.symbol === activeChart) ?? MARKETS[0];

  // Which tab the user clicked in the sidebar/bottom nav
  const handleTabClick = (tab: MainTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top Nav ── */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-gray-600 p-1"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            {/* Desktop sidebar toggle — like ChatGPT */}
            <button
              className="hidden md:flex text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              <Menu size={20} />
            </button>
            <Logo size={32} />
            <div>
              <h1 className="font-bold text-gray-900">Auto Trend X</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Trading Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Balance */}
            {currentAccount && (
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {currentAccount.currency ?? 'USD'} {fmt(currentAccount.balance)}
                </p>
                <p className="text-xs text-gray-500">
                  {currentAccount.loginid ?? currentAccount.account_id}
                </p>
              </div>
            )}
            {/* Logout — desktop only. On mobile it lives inside the hamburger drawer */}
            <button
              onClick={logout}
              className="hidden md:flex items-center gap-1.5 text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">

        {/* ── Desktop Sidebar (collapsible) ── */}
        <aside className={`hidden md:flex flex-col shrink-0 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-4rem)] transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>

          {!sidebarCollapsed && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2 px-4">
              Trading
            </p>
          )}

          {/* Nav items */}
          <nav className="flex-1 px-2 space-y-1 mt-1">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={sidebarCollapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  sidebarCollapsed ? 'justify-center' : 'text-left'
                } ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>

          {/* Balance + Logout at bottom */}
          {!sidebarCollapsed && (
            <div className="border-t border-gray-100 px-4 pt-3 pb-4 space-y-1">
              <p className="text-xs text-gray-400">Real: {realAccount?.currency ?? 'USD'} {fmt(realAccount?.balance)}</p>
              <p className="text-xs text-gray-400">Demo: USD {fmt(demoAccount?.balance)}</p>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}

          {/* Collapsed: just logout icon at bottom */}
          {sidebarCollapsed && (
            <div className="pb-4 px-2">
              <button
                onClick={logout}
                title="Logout"
                className="w-full flex items-center justify-center py-2.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </aside>

        {/* ── Mobile Drawer ── */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Logo size={28} />
                  <span className="font-bold text-gray-900">Auto Trend X</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X size={22} className="text-gray-400" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                  Trading
                </p>
                {MAIN_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Logout pinned near bottom — not too far down */}
              <div className="px-3 pb-4 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
                  <span>Real: {realAccount?.currency ?? 'USD'} {fmt(realAccount?.balance)}</span>
                  <span>Demo: {fmt(demoAccount?.balance)}</span>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="flex-1 px-4 py-6 space-y-6 pb-24 md:pb-6">

          {/* Balance bar (top of content) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Real Balance', value: `${realAccount?.currency ?? 'USD'} ${fmt(realAccount?.balance)}` },
              { label: 'Demo Balance', value: `USD ${fmt(demoAccount?.balance)}` },
              { label: 'Account', value: currentAccount?.loginid ?? currentAccount?.account_id ?? '—' },
              { label: 'Status', value: session?.wsToken ? '🟢 Connected' : '🟡 Loading…' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="font-bold text-gray-900 text-sm truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* ── Live Markets tab ── */}
          {activeTab === 'markets' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">Live Markets</h2>

              {/* Market selector */}
              <div className="flex gap-2 flex-wrap">
                {MARKETS.map((m) => (
                  <button
                    key={m.symbol}
                    onClick={() => setActiveChart(m.symbol)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeChart === m.symbol
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Main chart */}
              <DerivLiveChart
                key={activeChart}
                symbol={activeChart}
                wsToken={session?.wsToken ?? null}
                wsUrl={session?.wsUrl ?? null}
                label={activeMarket.label}
              />

              {/* Mini grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MARKETS.filter((m) => m.symbol !== activeChart).slice(0, 4).map((m) => (
                  <button
                    key={m.symbol}
                    onClick={() => setActiveChart(m.symbol)}
                    className="text-left hover:ring-2 hover:ring-emerald-300 rounded-xl transition-all"
                  >
                    <DerivLiveChart
                      symbol={m.symbol}
                      wsToken={session?.wsToken ?? null}
                      wsUrl={session?.wsUrl ?? null}
                      label={m.label}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Trading App tabs (Accumulators / Digits / Bot / Rise-Fall) ── */}
          {activeTab !== 'markets' && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">
                {MAIN_TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              <DerivAppLauncher
                wsToken={session?.wsToken ?? null}
                accountId={session?.accountId ?? null}
                focusApp={activeTab}
              />
            </div>
          )}

        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-[10px] leading-tight">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
