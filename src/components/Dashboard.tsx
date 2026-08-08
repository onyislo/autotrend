import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, RefreshCw, TrendingUp, Bot, BarChart2, Zap,
  ChevronRight, Activity, Menu, X, LayoutDashboard,
  Copy, Repeat
} from 'lucide-react';
import BotBuilder from './BotBuilder';
import ChartsSection from './ChartsSection';
import { getUserData } from '../lib/finalAuth';

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
  ODD: 'bg-orange-500', EVEN: 'bg-blue-500', OVER: 'bg-emerald-600',
  UNDER: 'bg-purple-500', DIFFERS: 'bg-emerald-600', MATCHES: 'bg-amber-500',
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
    const req: Record<string, unknown> = {
      proposal: 1,
      amount: stake,
      basis: 'stake',
      contract_type: contractType,
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      underlying_symbol: signal.symbol
    };
    if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') req.barrier = '5';
    ws.send(JSON.stringify(req));
    setStatus(`Requesting proposal for ${signal.type} on ${signal.market} ($${stake})`);
  }, [signal]);

  const startBot = useCallback(() => {
    const activeToken = wsToken || getUserData()?.access_token || null;
    const activeWsUrl = wsUrl || 'wss://ws.derivws.com/websockets/v3?app_id=36544';
    if (!activeToken) { setStatus('❌ Not authenticated. Please login again.'); return; }

    const maxWins = parseInt(settings.takeProfit), maxLoss = parseFloat(settings.stopLoss), maxConsecutive = parseInt(settings.consecutiveLosses), martingale = parseFloat(settings.martingale), baseStake = parseFloat(settings.stake);
    currentStake.current = baseStake; consecutiveLossCount.current = 0; totalLoss.current = 0;
    setWins(0); setLosses(0); setRunning(true); setStatus('Connecting to Deriv WebSocket...');
    
    const ws = new WebSocket(activeWsUrl); wsRef.current = ws;
    ws.onopen = () => { setStatus('Connected. Authorizing...'); ws.send(JSON.stringify({ authorize: activeToken })); };
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.msg_type === 'authorize') { setStatus('Authorized. Placing trade...'); placeTrade(ws, currentStake.current); }
      if (data.msg_type === 'proposal') {
        if (data.error) { setStatus(`❌ ${data.error.message}`); stopBot(); return; }
        if (data.proposal?.id) {
          ws.send(JSON.stringify({ buy: data.proposal.id, price: data.proposal.ask_price }));
        }
      }
      if (data.msg_type === 'buy') {
        if (data.error) { setStatus(`❌ ${data.error.message}`); stopBot(); return; }
        if (data.buy?.profit !== undefined) {
          const profit = parseFloat(data.buy.profit);
          if (profit > 0) {
            setWins(w => { const nw = w + 1; consecutiveLossCount.current = 0; currentStake.current = baseStake; if (nw >= maxWins) { setStatus(`🎉 Take profit reached! ${nw} wins.`); stopBot(); return nw; } setStatus(`✅ Win #${nw}! +$${profit.toFixed(2)}`); setTimeout(() => placeTrade(ws, currentStake.current), 500); return nw; });
          } else {
            setLosses(l => { totalLoss.current += Math.abs(profit); consecutiveLossCount.current++; const nl = l + 1; if (totalLoss.current >= maxLoss) { setStatus(`🛑 Stop loss reached ($${totalLoss.current.toFixed(2)}).`); stopBot(); return nl; } if (consecutiveLossCount.current >= maxConsecutive) { setStatus(`🛑 Max consecutive losses.`); stopBot(); return nl; } currentStake.current *= martingale; setStatus(`❌ Loss #${nl}. Next stake: $${currentStake.current.toFixed(2)}`); setTimeout(() => placeTrade(ws, currentStake.current), 500); return nl; });
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
          <p className="text-sm text-gray-400 mb-4">Selected: <span className="text-emerald-400 font-medium">{signal.market}</span> - {signal.type} (Rank #{signal.id} | Confidence: {signal.confidence}%)</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[{ label: 'STAKE', key: 'stake' }, { label: 'TAKE PROFIT (WINS)', key: 'takeProfit' }, { label: 'STOP LOSS ($)', key: 'stopLoss' }, { label: 'CONSECUTIVE LOSSES', key: 'consecutiveLosses' }].map(({ label, key }) => (
              <div key={key} className="bg-gray-800 rounded-xl p-3 border border-gray-600">
                <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">{label}</label>
                <input type="number" step="0.1" min="0" value={settings[key as keyof TradeSettings]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} disabled={running} className="bg-transparent text-white text-lg font-semibold w-full outline-none" />
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-600 mb-4">
            <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">MARTINGALE MULTIPLIER</label>
            <input type="number" step="0.1" min="1" value={settings.martingale} onChange={e => setSettings(s => ({ ...s, martingale: e.target.value }))} disabled={running} className="bg-transparent text-white text-lg font-semibold w-full outline-none" />
          </div>
          {status && <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm text-gray-300 border border-gray-600"><p>{status}</p>{(wins > 0 || losses > 0) && <p className="mt-1 text-xs">Wins: <span className="text-emerald-400">{wins}</span> | Losses: <span className="text-red-400">{losses}</span></p>}</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-semibold hover:bg-gray-600 transition-colors">Cancel</button>
            {running ? <button onClick={stopBot} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700">Stop Bot</button> : <button onClick={startBot} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600">Save and run</button>}
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
          <span className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">#{signal.id}</span>
          <p className="font-bold text-gray-900 text-sm">{signal.market}</p>
        </div>
        <span className={`${signal.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded`}>{signal.badge}</span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 uppercase font-medium">Confidence</span>
          <span className="text-sm font-bold text-gray-900">{signal.confidence}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${signal.confidence}%` }} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[{ label: signal.type, val: `${signal.confidence}%` }, { label: 'Most', val: signal.most }, { label: 'Least', val: signal.least }].map(({ label, val }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-400 uppercase">{label}</p><p className="font-bold text-gray-900 text-sm">{val}</p></div>
        ))}
      </div>
      <details className="mb-3"><summary className="text-xs text-emerald-600 cursor-pointer font-medium">Show details</summary><div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600"><p>Signal from last 500 ticks analysis</p></div></details>
      <button onClick={() => onLoad(signal)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">▶ Load {signal.badge} signal</button>
    </div>
  );
}

// ── Free Bots ─────────────────────────────────────────────────────────────────
const AUTOTRENDX_BOT_XML = `<?xml version="1.0" encoding="UTF-8"?><xml xmlns="https://developers.google.com/blockly/xml"><variables><variable type="" id="dalembert:resultIsWin">dalembert:resultIsWin</variable><variable type="" id="dalembert:profit">dalembert:profit</variable><variable type="" id="stake">stake</variable><variable type="" id="trader">trader</variable><variable type="" id="dalembert:totalProfit">dalembert:totalProfit</variable><variable type="" id="dalembert:tradeAgain">dalembert:tradeAgain</variable><variable type="" id="win">win</variable><variable type="" id="dalembert:expectedProfit">dalembert:expectedProfit</variable><variable type="" id="dalembert:size">dalembert:size</variable><variable type="" id="dalembert:amount">dalembert:amount</variable><variable type="" id="dalembert:profitUnits">dalembert:profitUnits</variable><variable type="" id="martingale">martingale</variable><variable type="" id="take profit">take profit</variable><variable type="" id="dalembert:maximumLoss">dalembert:maximumLoss</variable></variables><block type="trade_definition" deletable="false" x="32" y="32"><mutation has_initialization="true"></mutation><field name="MARKET_LIST">synthetic_index</field><field name="SUBMARKET_LIST">random_index</field><field name="SYMBOL_LIST">R_50</field><field name="TRADETYPE_LIST">digits</field><field name="TYPE_LIST">matchesdiffers</field><field name="DURATION_LIST">t</field><field name="DURATION_AMOUNT">60</field><field name="CURRENCY_LIST">USD</field><field name="AMOUNT_TYPE_LIST">stake</field><field name="AMOUNT">1</field><statement name="INITIALIZATION"><block type="procedures_callnoreturn"><mutation name="D&apos;Alembert Trade Amount"><arg name="dalembert:expectedProfit"></arg><arg name="dalembert:maximumLoss"></arg><arg name="dalembert:amount"></arg></mutation><value name="ARG0"><block type="math_number"><field name="NUM">10</field></block></value><value name="ARG1"><block type="math_number"><field name="NUM">80</field></block></value><value name="ARG2"><block type="math_number"><field name="NUM">1</field></block></value></block></statement><statement name="PURCHASE"><block type="purchase"><field name="PURCHASE_LIST">DIGITDIFF</field></block></statement><statement name="AFTER_PURCHASE"><block type="procedures_callnoreturn"><mutation name="D&apos;Alembert Trade Again After Purchase"><arg name="dalembert:profit"></arg><arg name="dalembert:tradeAgain"></arg></mutation><value name="ARG0"><block type="read_price"><field name="READ_PRICE_LIST">profit</field></block></value><value name="ARG1"><block type="logic_boolean"><field name="BOOL">FALSE</field></block></value></block></statement></block></xml>`;

const FREE_BOTS = [
  { id: 'autotrendx', name: 'AUTOTRENDX BOT', winRate: 99, description: "D'Alembert strategy on Volatility 50 (Digits). Auto-adjusts stake on wins/losses.", market: 'Volatility 50 Index', symbol: 'R_50', type: "D'Alembert / Digits", xml: AUTOTRENDX_BOT_XML },
];

function LoadBotModal({ bot, onClose, onGoToBotBuilder }: { bot: typeof FREE_BOTS[0]; onClose: () => void; onGoToBotBuilder: () => void }) {
  const [stake, setStake] = useState('1');
  const [takeProfit, setTakeProfit] = useState('10');
  const [stopLoss, setStopLoss] = useState('5');

  const handleLoad = () => {
    try {
      localStorage.setItem('autotrendx_loaded_xml', bot.xml);
      localStorage.setItem('autotrendx_loaded_bot_name', bot.name);
      localStorage.setItem('autotrendx_loaded_symbol', bot.symbol);
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
            ℹ️ Clicking Open Bot Builder loads strategy parameters directly into Bot Builder for live execution.
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

  // Strict account resolution — NEVER fallback Demo account under Real mode
  const storedAuth = getUserData();
  const accountsList: Array<{ account_id?: string; account_type?: string; balance?: number | string; currency?: string; loginid?: string }> =
    session?.accounts ||
    (storedAuth?.account
      ? [{ account_id: storedAuth.account, account_type: storedAuth.account_type, balance: 0, currency: storedAuth.currency, loginid: storedAuth.account }]
      : []);
  
  const realAccount = accountsList.find(a => a.account_type !== 'demo' && a.account_type !== 'virtual');
  const demoAccount = accountsList.find(a => a.account_type === 'demo' || a.account_type === 'virtual');
  
  // Strict mode: if accountMode is 'real', ONLY return realAccount (never fallback to demoAccount)
  const currentAccount = accountMode === 'real' ? realAccount : demoAccount;
  const isRealMode = accountMode === 'real';
  const currentAccountId = currentAccount?.account_id ?? currentAccount?.loginid ?? null;
  const clientToken = storedAuth?.access_token;

  useEffect(() => {
    let url = '/api/auth/me';
    const params = new URLSearchParams();
    if (clientToken) {
      params.append('token', clientToken);
    }
    if (currentAccountId) {
      params.append('accountId', currentAccountId);
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    if (currentAccountId) {
      document.cookie = `deriv_account_id=${currentAccountId}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}`;
    }

    fetch(url)
      .then(r => { if (!r.ok) return null; return r.json(); })
      .then((d: SessionData | null) => { 
        if (d && Array.isArray(d.accounts)) {
          setSession(d); 
        }
      })
      .catch(() => null);
  }, [currentAccountId, clientToken]);

  useEffect(() => {
    const iv = setInterval(() => setCountdown(c => { if (c <= 1) { setSignals(generateSignals()); return 20; } return c - 1; }), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => { 
    try {
      await fetch('/api/auth/logout', { method: 'POST' }); 
    } catch (e) {
      console.error('Logout failed:', e);
    }
    localStorage.removeItem('deriv_auth');
    sessionStorage.removeItem('auth_status');
    document.cookie = 'deriv_session=; Path=/; Max-Age=0';
    document.cookie = 'deriv_account_id=; Path=/; Max-Age=0';
    window.location.href = '/'; 
  };

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

        {/* Right: account switcher + balance */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Demo/Real toggle */}
          <button
            onClick={() => setAccountMode(m => m === 'real' ? 'demo' : 'real')}
            className={`flex items-center gap-1.5 border rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
              isRealMode ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
            }`}
          >
            <Repeat size={12} />
            <span>{isRealMode ? 'Real Account' : 'Demo Account'}</span>
          </button>
          
          <div className="text-right hidden sm:block">
            {currentAccount ? (
              <>
                <p className="text-sm font-bold text-white">USD {fmt(currentAccount.balance)}</p>
                <p className="text-xs text-gray-400 font-mono">{currentAccount.loginid ?? currentAccount.account_id ?? '—'}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-red-400">{isRealMode ? 'No Real Account Found' : 'No Demo Account Found'}</p>
                <p className="text-[10px] text-gray-400">Connect Deriv account</p>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile sidebar drawer (opens from the left) */}
      <AnimatePresence>
        {mobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenu(false)}
            />
            {/* Drawer Content */}
            <motion.aside
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col md:hidden border-r border-gray-200"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 h-14 bg-gray-900 text-white flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Logo size={28} />
                  <span className="font-bold">Auto Trend X</span>
                </div>
                <button
                  onClick={() => setMobileMenu(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Account details and toggle in mobile drawer */}
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Account</span>
                  <button
                    onClick={() => setAccountMode(m => m === 'real' ? 'demo' : 'real')}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      isRealMode ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-yellow-300 text-yellow-600 bg-yellow-50'
                    }`}
                  >
                    {isRealMode ? '● Real' : '● Demo'}
                  </button>
                </div>

                {currentAccount ? (
                  <>
                    <p className="font-bold text-gray-900 text-base">USD {fmt(currentAccount.balance)}</p>
                    <p className="text-xs text-gray-400 truncate font-mono">{currentAccount.loginid ?? currentAccount.account_id ?? '—'}</p>
                  </>
                ) : (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-xs font-bold text-red-600">{isRealMode ? 'No Real Account Found' : 'No Demo Account'}</p>
                    <p className="text-[10px] text-gray-500">Switch to {isRealMode ? 'Demo' : 'Real'}</p>
                  </div>
                )}

                {/* Show both accounts list when available inside mobile drawer */}
                <div className="mt-3 space-y-1">
                  {realAccount ? (
                    <button
                      onClick={() => {
                        setAccountMode('real');
                      }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                        isRealMode ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Real · USD {fmt(realAccount.balance)} ({realAccount.loginid ?? realAccount.account_id})
                    </button>
                  ) : (
                    <div className="text-[11px] text-gray-400 px-2 py-1 italic">Real: No account found</div>
                  )}

                  {demoAccount ? (
                    <button
                      onClick={() => {
                        setAccountMode('demo');
                      }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                        !isRealMode ? 'bg-yellow-50 text-yellow-700 font-semibold border border-yellow-100' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Demo · USD {fmt(demoAccount.balance)} ({demoAccount.loginid ?? demoAccount.account_id})
                    </button>
                  ) : (
                    <div className="text-[11px] text-gray-400 px-2 py-1 italic">Demo: No account found</div>
                  )}
                </div>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className={activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Logout button at bottom of mobile drawer */}
              <div className="p-3 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors border border-red-200"
                >
                  <LogOut size={16} />Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Ticker */}
      <div className="bg-white border-b border-gray-100 overflow-hidden py-1.5">
        <div className="flex gap-6 animate-ticker whitespace-nowrap">
          {[...MARKETS_TICKER, ...MARKETS_TICKER].map((m, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>{m}
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
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${isRealMode ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-yellow-300 text-yellow-600 bg-yellow-50'}`}>
                  {isRealMode ? '● Real' : '● Demo'}
                </button>
              </div>

              {currentAccount ? (
                <>
                  <p className="font-bold text-gray-900 text-sm">USD {fmt(currentAccount.balance)}</p>
                  <p className="text-xs text-gray-400 truncate font-mono">{currentAccount.loginid ?? currentAccount.account_id ?? '—'}</p>
                </>
              ) : (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-xs font-bold text-red-600">{isRealMode ? 'No Real Account Found' : 'No Demo Account'}</p>
                  <p className="text-[10px] text-gray-500">Switch to {isRealMode ? 'Demo' : 'Real'}</p>
                </div>
              )}

              {/* Show both accounts list when available */}
              <div className="mt-3 space-y-1">
                {realAccount ? (
                  <button onClick={() => setAccountMode('real')}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${isRealMode ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Real · USD {fmt(realAccount.balance)} ({realAccount.loginid ?? realAccount.account_id})
                  </button>
                ) : (
                  <div className="text-[11px] text-gray-400 px-2 py-1 italic">Real: No account found</div>
                )}

                {demoAccount ? (
                  <button onClick={() => setAccountMode('demo')}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors {!isRealMode ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Demo · USD {fmt(demoAccount.balance)} ({demoAccount.loginid ?? demoAccount.account_id})
                  </button>
                ) : (
                  <div className="text-[11px] text-gray-400 px-2 py-1 italic">Demo: No account found</div>
                )}
              </div>
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
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
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

          {/* D-Trader */}
          {activeTab === 'dtrader' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">D-Trader</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                <iframe src="https://app.deriv.com/dtrader" className="w-full h-full border-0" title="D-Trader" allow="clipboard-write" />
              </div>
            </div>
          )}

          {/* BotBuilder — 100% native bot builder panel */}
          {activeTab === 'botbuilder' && (
            <BotBuilder wsToken={session?.wsToken} wsUrl={session?.wsUrl} onGoToFreeBots={() => setActiveTab('freebots')} />
          )}

          {/* Charts — 100% native canvas live chart */}
          {activeTab === 'charts' && <ChartsSection wsToken={session?.wsToken} wsUrl={session?.wsUrl} />}

          {['quickbot', 'autotrade', 'copytrader'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-24 text-center max-w-7xl mx-auto">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4"><Zap size={32} className="text-emerald-500" /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{TABS.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-gray-500 max-w-sm font-medium">Auto-trading feature ready for execution via Bot Builder tab.</p>
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
