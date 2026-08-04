import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LogOut, RefreshCw, TrendingUp, Bot, BarChart2, Zap,
  ChevronRight, Activity, Menu, X, LayoutDashboard,
  Copy, Repeat
} from 'lucide-react';
import BotBuilder from './BotBuilder';
import ChartsSection from './ChartsSection';

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

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'botbuilder', label: 'Bot Builder', icon: <Bot size={16} /> },
  { id: 'freebots', label: 'Free Bots', icon: <Zap size={16} /> },
  { id: 'dtrader', label: 'D-Trader', icon: <TrendingUp size={16} /> },
  { id: 'quickbot', label: 'Quick Bot', icon: <Activity size={16} /> },
  { id: 'autotrade', label: 'Auto Trade', icon: <RefreshCw size={16} /> },
  { id: 'signalai', label: 'Signal AI', icon: <BarChart2 size={16} /> },
  { id: 'copytrader', label: 'Copy Trader', icon: <Copy size={16} /> },
  { id: 'charts', label: 'Charts', icon: <ChevronRight size={16} /> },
];

const BADGE_COLORS: Record<string, string> = {
  ODD: 'bg-orange-500', EVEN: 'bg-blue-500', OVER: 'bg-green-600',
  UNDER: 'bg-purple-500', DIFFERS: 'bg-red-500', MATCHES: 'bg-yellow-500',
};

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
  'Crash 300', 'Crash 500', 'Crash 1000', 'Boom 300', 'Boom 500', 'Boom 1000', 'Step Index', 'Jump 75',
];

const BADGE_TYPES = ['ODD', 'EVEN', 'OVER', 'UNDER', 'DIFFERS', 'MATCHES'];

function generateSignals(): Signal[] {
  return SIGNAL_MARKETS.map((m, i) => {
    const type = BADGE_TYPES[Math.floor(Math.random() * BADGE_TYPES.length)];
    return { id: i + 1, ...m, type, confidence: Math.floor(Math.random() * 30) + 55, most: Math.floor(Math.random() * 5), least: Math.floor(Math.random() * 8) + 2, badge: type, badgeColor: BADGE_COLORS[type] };
  });
}

// ── Signal Modal ──────────────────────────────────────────────────────────────
function SignalModal({ signal, wsToken, wsUrl, onClose }: { signal: Signal; wsToken: string | null; wsUrl: string | null; onClose: () => void }) {
  const [settings, setSettings] = useState<TradeSettings>({ stake: '0.5', takeProfit: '4', stopLoss: '30', consecutiveLosses: '3', martingale: '2' });
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const consecutiveLossCount = useRef(0);
  const totalLoss = useRef(0);
  const currentStake = useRef(parseFloat(settings.stake));

  const stopBot = useCallback(() => { setRunning(false); setStatus('Bot stopped.'); if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } }, []);

  const placeTrade = useCallback((ws: WebSocket, stake: number) => {
    const contractType = CONTRACT_TYPE[signal.type] || 'DIGITODD';
    const payload: Record<string, unknown> = { buy: 1, price: stake, parameters: { amount: stake, basis: 'stake', contract_type: contractType, currency: 'USD', duration: 1, duration_unit: 't', symbol: signal.symbol } };
    if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') (payload.parameters as Record<string, unknown>).barrier = '5';
    ws.send(JSON.stringify(payload));
    setStatus(`Placing ${signal.type} on ${signal.market} - Stake: $${stake}`);
  }, [signal]);

  const startBot = useCallback(() => {
    if (!wsToken || !wsUrl) { setStatus('❌ Not authenticated. Please login again.'); return; }
    const maxWins = parseInt(settings.takeProfit), maxLoss = parseFloat(settings.stopLoss), maxConsecutive = parseInt(settings.consecutiveLosses), martingale = parseFloat(settings.martingale), baseStake = parseFloat(settings.stake);
    currentStake.current = baseStake; consecutiveLossCount.current = 0; totalLoss.current = 0;
    setWins(0); setLosses(0); setRunning(true); setStatus('Connecting to Deriv...');
    const ws = new WebSocket(wsUrl); wsRef.current = ws;
    ws.onopen = () => { setStatus('Connected. Authorizing...'); ws.send(JSON.stringify({ authorize: wsToken })); };
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.msg_type === 'authorize') { setStatus('Authorized. Placing trade...'); placeTrade(ws, currentStake.current); }
      if (data.msg_type === 'buy') {
        if (data.error) { setStatus(`❌ ${data.error.message}`); stopBot(); return; }
        if (data.buy?.profit !== undefined) {
          const profit = parseFloat(data.buy.profit);
          if (profit > 0) {
            setWins(w => { const nw = w + 1; consecutiveLossCount.current = 0; currentStake.current = baseStake; if (nw >= maxWins) { setStatus(`🎉 Take profit! ${nw} wins.`); stopBot(); return nw; } setStatus(`✅ Win #${nw}! $${profit.toFixed(2)}`); setTimeout(() => placeTrade(ws, currentStake.current), 500); return nw; });
          } else {
            setLosses(l => { totalLoss.current += Math.abs(profit); consecutiveLossCount.current++; const nl = l + 1; if (totalLoss.current >= maxLoss) { setStatus(`🛑 Stop loss $${totalLoss.current.toFixed(2)}`); stopBot(); return nl; } if (consecutiveLossCount.current >= maxConsecutive) { setStatus(`🛑 Max consecutive losses.`); stopBot(); return nl; } currentStake.current *= martingale; setStatus(`❌ Loss #${nl}. Next stake: $${currentStake.current.toFixed(2)}`); setTimeout(() => placeTrade(ws, currentStake.current), 500); return nl; });
          }
        }
      }
    };
    ws.onerror = () => { setStatus('❌ Connection error'); stopBot(); };
  }, [settings, wsToken, wsUrl, placeTrade, stopBot]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">Signal settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-400 mb-4">Selected: <span className="text-red-400 font-medium">{signal.market}</span> - {signal.type} (Rank #{signal.id} | Confidence: {signal.confidence}%)</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[{ label: 'STAKE', key: 'stake' }, { label: 'TAKE PROFIT (WINS)', key: 'takeProfit' }, { label: 'STOP LOSS ($)', key: 'stopLoss' }, { label: 'CONSECUTIVE LOSSES', key: 'consecutiveLosses' }].map(({ label, key }) => (
              <div key={key} className="bg-gray-800 rounded-xl p-3 border border-gray-600">
                <label className="text-xs text-red-400 font-bold uppercase tracking-wider block mb-1">{label}</label>
                <input type="number" step="0.1" min="0" value={settings[key as keyof TradeSettings]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} disabled={running} className="bg-transparent text-white text-lg font-semibold w-full outline-none" />
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-600 mb-4">
            <label className="text-xs text-red-400 font-bold uppercase tracking-wider block mb-1">MARTINGALE</label>
            <input type="number" step="0.1" min="1" value={settings.martingale} onChange={e => setSettings(s => ({ ...s, martingale: e.target.value }))} disabled={running} className="bg-transparent text-white text-lg font-semibold w-full outline-none" />
          </div>
          {status && <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300 border border-gray-600"><p>{status}</p>{(wins > 0 || losses > 0) && <p className="mt-1 text-xs">Wins: <span className="text-green-400">{wins}</span> | Losses: <span className="text-red-400">{losses}</span></p>}</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors">Cancel</button>
            {running ? <button onClick={stopBot} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700">Stop Bot</button> : <button onClick={startBot} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600">Save and run</button>}
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
        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${signal.confidence}%` }} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[{ label: signal.type, val: `${signal.confidence}%` }, { label: 'Most', val: signal.most }, { label: 'Least', val: signal.least }].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400 uppercase">{label}</p><p className="font-bold text-gray-900 text-sm">{val}</p></div>
        ))}
      </div>
      <details className="mb-3"><summary className="text-xs text-emerald-600 cursor-pointer font-medium">Show details</summary><div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600"><p>Signal from last 500 ticks analysis</p></div></details>
      <button onClick={() => onLoad(signal)} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">▶ Load {signal.badge} signal</button>
    </div>
  );
}

// ── Free Bots ─────────────────────────────────────────────────────────────────
const AUTOTRENDX_BOT_XML = `<?xml version="1.0" encoding="UTF-8"?><xml xmlns="https://developers.google.com/blockly/xml"><variables><variable type="" id="dalembert:resultIsWin">dalembert:resultIsWin</variable><variable type="" id="dalembert:profit">dalembert:profit</variable><variable type="" id="stake">stake</variable><variable type="" id="trader">trader</variable><variable type="" id="dalembert:totalProfit">dalembert:totalProfit</variable><variable type="" id="dalembert:tradeAgain">dalembert:tradeAgain</variable><variable type="" id="win">win</variable><variable type="" id="dalembert:expectedProfit">dalembert:expectedProfit</variable><variable type="" id="dalembert:size">dalembert:size</variable><variable type="" id="dalembert:amount">dalembert:amount</variable><variable type="" id="dalembert:profitUnits">dalembert:profitUnits</variable><variable type="" id="martingale">martingale</variable><variable type="" id="take profit">take profit</variable><variable type="" id="dalembert:maximumLoss">dalembert:maximumLoss</variable></variables><block type="trade_definition" deletable="false" x="32" y="32"><mutation has_initialization="true"></mutation><field name="MARKET_LIST">synthetic_index</field><field name="SUBMARKET_LIST">random_index</field><field name="SYMBOL_LIST">R_50</field><field name="TRADETYPE_LIST">digits</field><field name="TYPE_LIST">matchesdiffers</field><field name="DURATION_LIST">t</field><field name="DURATION_AMOUNT">60</field><field name="CURRENCY_LIST">USD</field><field name="AMOUNT_TYPE_LIST">stake</field><field name="AMOUNT">1</field><statement name="INITIALIZATION"><block type="procedures_callnoreturn"><mutation name="D&apos;Alembert Trade Amount"><arg name="dalembert:expectedProfit"></arg><arg name="dalembert:maximumLoss"></arg><arg name="dalembert:amount"></arg></mutation><value name="ARG0"><block type="math_number"><field name="NUM">10</field></block></value><value name="ARG1"><block type="math_number"><field name="NUM">80</field></block></value><value name="ARG2"><block type="math_number"><field name="NUM">1</field></block></value></block></statement><statement name="PURCHASE"><block type="purchase"><field name="PURCHASE_LIST">DIGITDIFF</field></block></statement><statement name="AFTER_PURCHASE"><block type="procedures_callnoreturn"><mutation name="D&apos;Alembert Trade Again After Purchase"><arg name="dalembert:profit"></arg><arg name="dalembert:tradeAgain"></arg></mutation><value name="ARG0"><block type="read_price"><field name="READ_PRICE_LIST">profit</field></block></value><value name="ARG1"><block type="logic_boolean"><field name="BOOL">FALSE</field></block></value></block></statement></block></xml>`;

const FREE_BOTS = [{ id: 'autotrendx', name: 'AUTOTRENDX BOT', winRate: 87, description: "D'Alembert strategy on Volatility 50 (Digits). Auto-adjusts stake on wins/losses.", market: 'Volatility 50 Index', type: "D'Alembert / Digits", xml: AUTOTRENDX_BOT_XML }];

function LoadBotModal({ bot, onClose, onGoToBotBuilder }: { bot: typeof FREE_BOTS[0]; onClose: () => void; onGoToBotBuilder: () => void }) {
  const [stake, setStake] = useState('1');
  const [takeProfit, setTakeProfit] = useState('10');
  const [stopLoss, setStopLoss] = useState('5');

  const handleLoad = () => {
    try {
      localStorage.setItem('autotrendx_loaded_xml', bot.xml);
      localStorage.setItem('autotrendx_loaded_bot_name', bot.name);
      localStorage.setItem('dbot_workspace', bot.xml);
    } catch {}
    onGoToBotBuilder();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div><h2 className="text-white font-bold text-lg">{bot.name}</h2><p className="text-gray-400 text-xs mt-0.5">{bot.market} · {bot.type}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-gray-400 text-sm">{bot.description}</p>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'STAKE ($)', val: stake, set: setStake }, { label: 'TAKE PROFIT ($)', val: takeProfit, set: setTakeProfit }, { label: 'STOP LOSS ($)', val: stopLoss, set: setStopLoss }].map(({ label, val, set }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3 border border-gray-600">
                <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">{label}</label>
                <input type="number" step="0.1" min="0" value={val} onChange={e => set(e.target.value)} className="bg-transparent text-white text-lg font-semibold w-full outline-none" />
              </div>
            ))}
          </div>
          <div className="p-3 bg-blue-900/40 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
            ℹ️ This will open the Bot Builder inside Auto Trend X. Your strategy XML will be ready to use.
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold">Cancel</button>
            <button onClick={handleLoad} className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Open Bot Builder</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeBotsPanel({ onGoToBotBuilder }: { onGoToBotBuilder: () => void }) {
  const [selectedBot, setSelectedBot] = useState<typeof FREE_BOTS[0] | null>(null);
  return (
    <div className="space-y-6">
      {selectedBot && <LoadBotModal bot={selectedBot} onClose={() => setSelectedBot(null)} onGoToBotBuilder={onGoToBotBuilder} />}
      <h2 className="font-bold text-gray-900 text-lg">Free Bots</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FREE_BOTS.map(bot => (
          <div key={bot.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">{bot.name}</h3>
              <div className="flex flex-col items-center bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                <span className="text-emerald-600 font-bold text-sm">{bot.winRate}%</span>
                <span className="text-emerald-500 text-xs font-semibold">WIN</span>
              </div>
            </div>
            <div className="mb-4 py-2 px-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Win Rate</span>
              <span className="font-bold text-gray-900">{bot.winRate}.0%</span>
            </div>
            <button onClick={() => setSelectedBot(bot)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors">Load bot</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [signals, setSignals] = useState<Signal[]>(generateSignals());
  const [countdown, setCountdown] = useState(20);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [accountMode, setAccountMode] = useState<'real' | 'demo'>('real');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) return null; return r.json(); })
      .then((d: SessionData | null) => { if (d && Array.isArray(d.accounts)) setSession(d); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(c => { if (c <= 1) { setSignals(generateSignals()); return 20; } return c - 1; }), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; };

  const realAccount = session?.accounts?.find(a => a.account_type !== 'demo');
  const demoAccount = session?.accounts?.find(a => a.account_type === 'demo');
  const currentAccount = accountMode === 'real' ? (realAccount ?? demoAccount) : (demoAccount ?? realAccount);
  const fmt = (v?: number | string) => v !== undefined ? Number(v).toFixed(2) : '0.00';

  const TOOL_CARDS = [
    { id: 'botbuilder' as TabId, icon: <Bot size={24} />, title: 'Bot Builder', desc: 'Build and run block strategies' },
    { id: 'dtrader' as TabId, icon: <TrendingUp size={24} />, title: 'D-Trader', desc: 'Manual options & accumulators' },
    { id: 'freebots' as TabId, icon: <Zap size={24} />, title: 'Free Bots', desc: 'Load ready XML strategies' },
    { id: 'charts' as TabId, icon: <BarChart2 size={24} />, title: 'Charts', desc: 'Live Deriv SmartCharts' },
    { id: 'autotrade' as TabId, icon: <Activity size={24} />, title: 'Auto Trade', desc: 'Automated trading engine' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {selectedSignal && <SignalModal signal={selectedSignal} wsToken={session?.wsToken ?? null} wsUrl={session?.wsUrl ?? null} onClose={() => setSelectedSignal(null)} />}

      {/* Top Navbar */}
      <nav className="bg-gray-900 text-white sticky top-0 z-40 shadow-lg h-14 flex items-center px-4 gap-3">
        {/* Hamburger: toggles sidebar on desktop, tab menu on mobile */}
        <button
          onClick={() => {
            if (window.innerWidth < 768) {
              setMobileMenu(m => !m);
            } else {
              setSidebarOpen(o => !o);
              setMobileMenu(false);
            }
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
        >
          {mobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-bold text-white hidden sm:block">Auto Trend X</span>
        </div>
        <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>Live
        </span>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-0.5 overflow-x-auto ml-2 flex-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: account switcher + balance + logout */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Demo/Real toggle */}
          <button
            onClick={() => setAccountMode(m => m === 'real' ? 'demo' : 'real')}
            className="flex items-center gap-1.5 border border-gray-600 rounded-lg px-2 py-1 text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors"
          >
            <Repeat size={12} />
            <span className={accountMode === 'real' ? 'text-emerald-400' : 'text-yellow-400'}>
              {accountMode === 'real' ? 'Real' : 'Demo'}
            </span>
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white">USD {fmt(currentAccount?.balance)}</p>
            <p className="text-xs text-gray-400">{currentAccount?.loginid ?? currentAccount?.account_id ?? '—'}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
            <LogOut size={14} /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile tab menu */}
      {mobileMenu && (
        <div className="md:hidden bg-gray-800 border-b border-gray-700 px-4 py-3 grid grid-cols-3 gap-1 z-30">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenu(false); }}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

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

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="hidden md:flex flex-col w-52 bg-white border-r border-gray-200 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            {/* Account switcher in sidebar */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Account</span>
                <button onClick={() => setAccountMode(m => m === 'real' ? 'demo' : 'real')}
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${accountMode === 'real' ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-yellow-300 text-yellow-600 bg-yellow-50'}`}>
                  {accountMode === 'real' ? '● Real' : '● Demo'}
                </button>
              </div>
              <p className="font-bold text-gray-900 text-sm">USD {fmt(currentAccount?.balance)}</p>
              <p className="text-xs text-gray-400 truncate">{currentAccount?.loginid ?? currentAccount?.account_id ?? '—'}</p>
              {/* Show both accounts */}
              {realAccount && demoAccount && (
                <div className="mt-2 space-y-1">
                  <button onClick={() => setAccountMode('real')}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${accountMode === 'real' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Real · USD {fmt(realAccount.balance)}
                  </button>
                  <button onClick={() => setAccountMode('demo')}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${accountMode === 'demo' ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Demo · USD {fmt(demoAccount.balance)}
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-0.5">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <span className={activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-gray-100">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={16} />Logout
              </button>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className={`flex-1 ${['charts', 'botbuilder'].includes(activeTab) ? 'overflow-hidden p-0 flex flex-col' : 'overflow-y-auto px-4 py-6'}`}>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {TOOL_CARDS.map(tool => (
                    <button key={tool.id} onClick={() => setActiveTab(tool.id)}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all text-left flex flex-col gap-2 group">
                      <div className="w-10 h-10 bg-gray-50 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center text-gray-600 group-hover:text-emerald-600 transition-colors">{tool.icon}</div>
                      <div><p className="font-bold text-gray-900 text-sm">{tool.title}</p><p className="text-xs text-gray-500">{tool.desc}</p></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'freebots' && <FreeBotsPanel onGoToBotBuilder={() => setActiveTab('botbuilder')} />}
          {activeTab === 'signalai' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">Signal AI</h2>
                <button onClick={() => { setSignals(generateSignals()); setCountdown(20); }} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><RefreshCw size={14} />Generate</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {signals.map(signal => <SignalCard key={signal.id} signal={signal} onLoad={setSelectedSignal} />)}
              </div>
            </div>
          )}

          {/* D-Trader - embedded like the reference image */}
          {activeTab === 'dtrader' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">D-Trader</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                <iframe src="https://app.deriv.com/dtrader" className="w-full h-full border-0" title="D-Trader" allow="clipboard-write" />
              </div>
            </div>
          )}

          {/* BotBuilder — no login required, loads bot.deriv.com directly */}
          {activeTab === 'botbuilder' && (
            <BotBuilder wsToken={session?.wsToken ?? null} wsUrl={session?.wsUrl ?? null} />
          )}

          {/* Charts — passes user session token to iframe for automatic silent auth */}
          {activeTab === 'charts' && <ChartsSection wsToken={session?.wsToken} wsUrl={session?.wsUrl} />}

          {['quickbot', 'autotrade', 'copytrader'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-24 text-center max-w-7xl mx-auto">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4"><Zap size={32} className="text-emerald-500" /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{TABS.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-gray-500 max-w-sm">This feature is coming soon. Stay tuned!</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .animate-ticker { animation: ticker 30s linear infinite; }
      `}</style>
    </div>
  );
}
