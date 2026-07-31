import { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, RefreshCw, TrendingUp, Bot, BarChart2, Zap, ChevronRight, Activity, Menu, X } from 'lucide-react';

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#db-g)" />
      <rect x="8" y="20" width="4" height="8" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="16" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="24" y="16" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
      <defs><linearGradient id="db-g" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" /><stop offset="1" stopColor="#059669" />
      </linearGradient></defs>
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TabId = 'dashboard' | 'botbuilder' | 'freebots' | 'dtrader' | 'quickbot' | 'autotrade' | 'signalai' | 'copytrader' | 'charts';

interface Signal {
  id: number; market: string; symbol: string; type: string;
  confidence: number; most: number; least: number;
  badge: string; badgeColor: string;
}

interface TradeSettings {
  stake: string; takeProfit: string; stopLoss: string;
  consecutiveLosses: string; martingale: string;
}

interface SessionData {
  accounts: Array<{ account_id?: string; account_type?: string; balance?: number | string; currency?: string; loginid?: string }>;
  wsToken: string | null; wsUrl: string | null; accountId: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' }, { id: 'botbuilder', label: 'Bot Builder' },
  { id: 'freebots', label: 'Free Bots' }, { id: 'dtrader', label: 'D-Trader' },
  { id: 'quickbot', label: 'Quick Bot' }, { id: 'autotrade', label: 'Auto Trade' },
  { id: 'signalai', label: 'Signal AI' }, { id: 'copytrader', label: 'Copy Trader' },
  { id: 'charts', label: 'Charts' },
];

const BADGE_COLORS: Record<string, string> = {
  ODD: 'bg-orange-500', EVEN: 'bg-blue-500', OVER: 'bg-green-600',
  UNDER: 'bg-purple-500', DIFFERS: 'bg-red-500', MATCHES: 'bg-yellow-500',
};

// Contract type mapping for Deriv API
const CONTRACT_TYPE: Record<string, string> = {
  ODD: 'DIGITODD', EVEN: 'DIGITEVEN', OVER: 'DIGITOVER',
  UNDER: 'DIGITUNDER', DIFFERS: 'DIGITDIFF', MATCHES: 'DIGITMATCH',
};

const SIGNAL_MARKETS = [
  { market: 'Volatility 100 Index', symbol: 'R_100' },
  { market: 'Volatility 50 (1s) Index', symbol: '1HZ50V' },
  { market: 'Volatility 75 Index', symbol: 'R_75' },
  { market: 'Volatility 25 (1s) Index', symbol: '1HZ25V' },
  { market: 'Crash 500 Index', symbol: 'CRASH500' },
  { market: 'Boom 1000 Index', symbol: 'BOOM1000' },
];

const MARKETS_TICKER = [
  'Volatility 10 (1s)', 'Volatility 25 (1s)', 'Volatility 75 (1s)', 'Volatility 100 (1s)',
  'Crash 300 Index', 'Crash 500 Index', 'Crash 1000 Index', 'Boom 300 Index',
  'Boom 500 Index', 'Boom 1000 Index', 'Step Index', 'Jump 75 Index',
];

const BADGE_TYPES = ['ODD', 'EVEN', 'OVER', 'UNDER', 'DIFFERS', 'MATCHES'];

function generateSignals(): Signal[] {
  return SIGNAL_MARKETS.map((m, i) => {
    const type = BADGE_TYPES[Math.floor(Math.random() * BADGE_TYPES.length)];
    return {
      id: i + 1, ...m, type,
      confidence: Math.floor(Math.random() * 30) + 55,
      most: Math.floor(Math.random() * 5),
      least: Math.floor(Math.random() * 8) + 2,
      badge: type, badgeColor: BADGE_COLORS[type],
    };
  });
}

// ── Signal Settings Modal ─────────────────────────────────────────────────────
function SignalModal({ signal, wsToken, wsUrl, accountId, onClose }: {
  signal: Signal; wsToken: string | null; wsUrl: string | null;
  accountId: string | null; onClose: () => void;
}) {
  const [settings, setSettings] = useState<TradeSettings>({
    stake: '0.5', takeProfit: '4', stopLoss: '30',
    consecutiveLosses: '3', martingale: '2',
  });
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const consecutiveLossCount = useRef(0);
  const totalLoss = useRef(0);
  const currentStake = useRef(parseFloat(settings.stake));

  const stopBot = useCallback(() => {
    setRunning(false);
    setStatus('Bot stopped.');
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }, []);

  const placeTrade = useCallback((ws: WebSocket, stake: number) => {
    const contractType = CONTRACT_TYPE[signal.type] || 'DIGITODD';
    const payload: Record<string, unknown> = {
      buy: 1, price: stake,
      parameters: {
        amount: stake, basis: 'stake',
        contract_type: contractType,
        currency: 'USD', duration: 1, duration_unit: 't',
        symbol: signal.symbol,
      },
    };
    if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') {
      (payload.parameters as Record<string, unknown>).barrier = '5';
    }
    ws.send(JSON.stringify(payload));
    setStatus(`Placing ${signal.type} trade on ${signal.market} - Stake: $${stake}`);
  }, [signal]);

  const startBot = useCallback(() => {
    if (!wsToken || !wsUrl) {
      setStatus('❌ Not authenticated. Please login again.');
      return;
    }

    const maxWins = parseInt(settings.takeProfit);
    const maxLoss = parseFloat(settings.stopLoss);
    const maxConsecutive = parseInt(settings.consecutiveLosses);
    const martingale = parseFloat(settings.martingale);
    const baseStake = parseFloat(settings.stake);

    currentStake.current = baseStake;
    consecutiveLossCount.current = 0;
    totalLoss.current = 0;
    setWins(0); setLosses(0);
    setRunning(true);
    setStatus('Connecting to Deriv...');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('Connected. Authorizing...');
      ws.send(JSON.stringify({ authorize: wsToken }));
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);

      if (data.msg_type === 'authorize') {
        setStatus('Authorized. Placing first trade...');
        placeTrade(ws, currentStake.current);
      }

      if (data.msg_type === 'buy') {
        if (data.error) {
          setStatus(`❌ Trade error: ${data.error.message}`);
          stopBot(); return;
        }
        setStatus(`Trade placed. Contract: ${data.buy?.contract_id}. Waiting for result...`);
      }

      if (data.msg_type === 'proposal_open_contract' || data.msg_type === 'buy') {
        if (data.buy?.profit !== undefined) {
          const profit = parseFloat(data.buy.profit);
          if (profit > 0) {
            setWins(w => {
              const newWins = w + 1;
              consecutiveLossCount.current = 0;
              currentStake.current = baseStake;
              if (newWins >= maxWins) { setStatus(`🎉 Take profit reached! ${newWins} wins.`); stopBot(); return newWins; }
              setStatus(`✅ Win #${newWins}! Profit: $${profit.toFixed(2)}`);
              setTimeout(() => placeTrade(ws, currentStake.current), 500);
              return newWins;
            });
          } else {
            setLosses(l => {
              totalLoss.current += Math.abs(profit);
              consecutiveLossCount.current++;
              const newLosses = l + 1;
              if (totalLoss.current >= maxLoss) { setStatus(`🛑 Stop loss hit! Loss: $${totalLoss.current.toFixed(2)}`); stopBot(); return newLosses; }
              if (consecutiveLossCount.current >= maxConsecutive) { setStatus(`🛑 Max consecutive losses (${maxConsecutive}) hit.`); stopBot(); return newLosses; }
              currentStake.current = currentStake.current * martingale;
              setStatus(`❌ Loss #${newLosses}. Next stake: $${currentStake.current.toFixed(2)}`);
              setTimeout(() => placeTrade(ws, currentStake.current), 500);
              return newLosses;
            });
          }
        }
      }
    };

    ws.onerror = () => { setStatus('❌ WebSocket error'); stopBot(); };
    ws.onclose = () => { if (running) setStatus('Disconnected.'); };
  }, [settings, wsToken, wsUrl, placeTrade, stopBot, running]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">Signal settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-400 mb-4">
            Selected: <span className="text-red-400 font-medium">{signal.market}</span> - {signal.type} (Rank #{signal.id} | Confidence: {signal.confidence}%)
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'STAKE', key: 'stake' }, { label: 'TAKE PROFIT (NO OF WINS)', key: 'takeProfit' },
              { label: 'STOP LOSS', key: 'stopLoss' }, { label: 'CONSECUTIVE LOSSES', key: 'consecutiveLosses' },
            ].map(({ label, key }) => (
              <div key={key} className="bg-gray-800 rounded-xl p-3 border border-gray-600">
                <label className="text-xs text-red-400 font-bold uppercase tracking-wider block mb-1">{label}</label>
                <input
                  type="number" step="0.1" min="0"
                  value={settings[key as keyof TradeSettings]}
                  onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                  disabled={running}
                  className="bg-transparent text-white text-lg font-semibold w-full outline-none"
                />
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-600 mb-4">
            <label className="text-xs text-red-400 font-bold uppercase tracking-wider block mb-1">MARTINGALE</label>
            <input
              type="number" step="0.1" min="1"
              value={settings.martingale}
              onChange={e => setSettings(s => ({ ...s, martingale: e.target.value }))}
              disabled={running}
              className="bg-transparent text-white text-lg font-semibold w-full outline-none"
            />
          </div>
          {status && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300 border border-gray-600">
              <p>{status}</p>
              {(wins > 0 || losses > 0) && (
                <p className="mt-1 text-xs">Wins: <span className="text-green-400">{wins}</span> | Losses: <span className="text-red-400">{losses}</span></p>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors">Cancel</button>
            {running ? (
              <button onClick={stopBot} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">Stop Bot</button>
            ) : (
              <button onClick={startBot} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">Save and run</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Signal Card ───────────────────────────────────────────────────────────────
function SignalCard({ signal, onLoad }: { signal: Signal; onLoad: (s: Signal) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">#{signal.id}</span>
          <p className="font-bold text-gray-900 text-sm">{signal.market}</p>
        </div>
        <span className={`${signal.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded`}>{signal.badge}</span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 uppercase font-medium">Confidence</span>
          <span className="text-sm font-bold text-gray-900">{signal.confidence}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${signal.confidence}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[{ label: signal.type, val: `${signal.confidence}%` }, { label: 'Most', val: signal.most }, { label: 'Least', val: signal.least }].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-400 uppercase">{label}</p>
            <p className="font-bold text-gray-900 text-sm">{val}</p>
          </div>
        ))}
      </div>
      <details className="mb-3">
        <summary className="text-xs text-emerald-600 cursor-pointer font-medium">Show details</summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
          <p>Signal from last 500 ticks analysis</p>
          <p>Strategy: {signal.type === 'ODD' || signal.type === 'EVEN' ? 'Digits' : 'Over/Under'}</p>
        </div>
      </details>
      <button onClick={() => onLoad(signal)} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
        ▶ Load {signal.badge} signal
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [signals, setSignals] = useState<Signal[]>(generateSignals());
  const [countdown, setCountdown] = useState(20);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);

  // Fetch session from serverless /api/auth/me
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then((data: SessionData) => setSession(data)).catch(() => null);
  }, []);

  // Auto-refresh signals
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { setSignals(generateSignals()); return 20; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const realAccount = session?.accounts.find(a => a.account_type !== 'demo');
  const demoAccount = session?.accounts.find(a => a.account_type === 'demo');
  const currentAccount = session?.accounts.find(a => a.account_id === session.accountId) ?? realAccount ?? session?.accounts[0];
  const fmt = (v?: number | string) => v !== undefined ? Number(v).toFixed(2) : '—';

  const TOOL_CARDS = [
    { id: 'botbuilder' as TabId, icon: <Bot size={26} />, title: 'Bot Builder', desc: 'Build and run block strategies' },
    { id: 'dtrader' as TabId, icon: <TrendingUp size={26} />, title: 'D-Trader', desc: 'Manual options & accumulators' },
    { id: 'freebots' as TabId, icon: <Zap size={26} />, title: 'Free Bots', desc: 'Load ready XML strategies' },
    { id: 'charts' as TabId, icon: <BarChart2 size={26} />, title: 'Charts', desc: 'Live Deriv SmartCharts' },
    { id: 'autotrade' as TabId, icon: <Activity size={26} />, title: 'Auto Trade', desc: 'Automated trading engine' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {selectedSignal && (
        <SignalModal
          signal={selectedSignal}
          wsToken={session?.wsToken ?? null}
          wsUrl={session?.wsUrl ?? null}
          accountId={session?.accountId ?? null}
          onClose={() => setSelectedSignal(null)}
        />
      )}

      {/* Top Nav */}
      <nav className="bg-gray-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <span className="font-bold text-white hidden sm:block">Auto Trend X</span>
            </div>
            <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>Live
            </span>
          </div>
          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-0.5 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{currentAccount?.currency ?? 'USD'} {fmt(currentAccount?.balance)}</p>
              <p className="text-xs text-gray-400">{currentAccount?.loginid ?? currentAccount?.account_id ?? '—'}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
              <LogOut size={14} /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-white/10 bg-gray-800 px-4 py-3 grid grid-cols-3 gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenu(false); }}
                className={`px-2 py-2 rounded-lg text-xs font-medium text-left transition-colors ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Ticker */}
      <div className="bg-white border-b border-gray-100 overflow-hidden py-1.5">
        <div className="flex gap-6 animate-ticker whitespace-nowrap">
          {[...MARKETS_TICKER, ...MARKETS_TICKER].map((m, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>{m}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <h2 className="font-bold text-gray-900 uppercase text-sm tracking-wider">Live Trading Signals</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Next refresh <span className="font-bold text-gray-900">{countdown}s</span></span>
                <button onClick={() => { setSignals(generateSignals()); setCountdown(20); }}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <RefreshCw size={14} />Refresh now
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {signals.map(signal => <SignalCard key={signal.id} signal={signal} onLoad={setSelectedSignal} />)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Trading Tools</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {TOOL_CARDS.map(tool => (
                  <button key={tool.id} onClick={() => setActiveTab(tool.id)}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all text-left flex items-start gap-3 group">
                    <div className="w-11 h-11 bg-gray-50 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-emerald-600 transition-colors shrink-0">{tool.icon}</div>
                    <div><p className="font-bold text-gray-900 text-sm mb-0.5">{tool.title}</p><p className="text-xs text-gray-500">{tool.desc}</p></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Signal AI Tab */}
        {activeTab === 'signalai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Signal AI</h2>
              <button onClick={() => { setSignals(generateSignals()); setCountdown(20); }}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <RefreshCw size={14} />Generate Signals
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {signals.map(signal => <SignalCard key={signal.id} signal={signal} onLoad={setSelectedSignal} />)}
            </div>
          </div>
        )}

        {/* D-Trader */}
        {activeTab === 'dtrader' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">D-Trader</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
              <iframe src="https://app.deriv.com/dtrader" className="w-full h-full border-0" title="D-Trader" allow="clipboard-write" />
            </div>
          </div>
        )}

        {/* Bot Builder */}
        {activeTab === 'botbuilder' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Bot Builder</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
              <iframe src="https://app.deriv.com/bot" className="w-full h-full border-0" title="Bot Builder" allow="clipboard-write" />
            </div>
          </div>
        )}

        {/* Charts */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Charts</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '70vh' }}>
              <iframe src="https://app.deriv.com/dtrader#chart" className="w-full h-full border-0" title="Charts" />
            </div>
          </div>
        )}

        {/* Coming soon tabs */}
        {['freebots', 'quickbot', 'autotrade', 'copytrader'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
              <ChevronRight size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{TABS.find(t => t.id === activeTab)?.label}</h2>
            <p className="text-gray-500 max-w-sm">This feature is coming soon. Stay tuned!</p>
          </div>
        )}
      </main>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-ticker { animation: ticker 30s linear infinite; }
      `}</style>
    </div>
  );
}
