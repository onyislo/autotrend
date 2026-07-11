import { useState, useEffect } from 'react';
import { LogOut, Menu, X, Wifi, WifiOff } from 'lucide-react';
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
// Markets to show live charts for
// ---------------------------------------------------------------------------
const MARKETS = [
  { symbol: 'R_10',   label: 'Volatility 10 Index' },
  { symbol: 'R_25',   label: 'Volatility 25 Index' },
  { symbol: 'R_50',   label: 'Volatility 50 Index' },
  { symbol: 'R_75',   label: 'Volatility 75 Index' },
  { symbol: 'R_100',  label: 'Volatility 100 Index' },
  { symbol: 'CRASH300N', label: 'Crash 300 Index' },
  { symbol: 'BOOM300N', label: 'Boom 300 Index' },
  { symbol: 'JD10',   label: 'Jump 10 Index' },
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [session, setSession] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const currentAccount = session?.accounts.find(
    (a) => a.account_id === session.accountId
  ) ?? realAccount ?? session?.accounts[0];

  const formatBalance = (val: number | string | undefined) =>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Nav ── */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-gray-600 p-1"
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
            {/* Connection status */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              {session?.wsToken ? (
                <><Wifi size={14} className="text-emerald-500" /> Live</>
              ) : (
                <><WifiOff size={14} className="text-red-400" /> Offline</>
              )}
            </div>

            {/* Account balances */}
            {currentAccount && (
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {currentAccount.currency ?? 'USD'} {formatBalance(currentAccount.balance)}
                </p>
                <p className="text-xs text-gray-500">{currentAccount.loginid ?? currentAccount.account_id}</p>
              </div>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2"><Logo size={28} /><span className="font-bold">Auto Trend X</span></div>
              <button onClick={() => setMobileMenuOpen(false)}><X size={22} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Markets</p>
              {MARKETS.map((m) => (
                <button
                  key={m.symbol}
                  onClick={() => { setActiveChart(m.symbol); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeChart === m.symbol ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="text-sm text-gray-500 mb-1">
                Real: {currentAccount?.currency} {formatBalance(realAccount?.balance)}
              </div>
              <div className="text-sm text-gray-500 mb-3">
                Demo: USD {formatBalance(demoAccount?.balance)}
              </div>
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Balance Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Real Balance', value: `${realAccount?.currency ?? 'USD'} ${formatBalance(realAccount?.balance)}`, color: 'emerald' },
            { label: 'Demo Balance', value: `USD ${formatBalance(demoAccount?.balance)}`, color: 'blue' },
            { label: 'Account', value: currentAccount?.loginid ?? currentAccount?.account_id ?? '—', color: 'gray' },
            { label: 'Status', value: session?.wsToken ? '🟢 Live Connected' : '🔴 Connecting…', color: 'gray' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="font-bold text-gray-900 text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* ── Live Charts ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Live Markets</h2>
            <span className="text-xs text-gray-400">Real-time via Deriv WebSocket</span>
          </div>

          {/* Market selector tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
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

          {/* Active chart — full width */}
          <DerivLiveChart
            key={activeChart}
            symbol={activeChart}
            wsToken={session?.wsToken ?? null}
            wsUrl={session?.wsUrl ?? null}
            label={activeMarket.label}
          />

          {/* Mini chart grid — all other markets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
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

        {/* ── Deriv App Launcher ── */}
        <DerivAppLauncher
          wsToken={session?.wsToken ?? null}
          accountId={session?.accountId ?? null}
        />

      </div>
    </div>
  );
}
