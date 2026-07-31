import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, Plus, Trash2, ChevronDown, ChevronUp,
  Bot, Zap, TrendingUp, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Activity, Settings, BarChart2, ExternalLink
} from 'lucide-react';

type ContractType = 'DIGITODD' | 'DIGITEVEN' | 'DIGITOVER' | 'DIGITUNDER' | 'DIGITDIFF' | 'DIGITMATCH' | 'CALL' | 'PUT';
type StrategyType = 'fixed' | 'martingale' | 'dalembert' | 'fibonacci';

interface BotConfig {
  name: string;
  symbol: string;
  contractType: ContractType;
  stake: string;
  duration: string;
  takeProfit: string;
  stopLoss: string;
  maxTrades: string;
  strategy: StrategyType;
  strategyParam: string;
  barrier: string;
}

interface TradeLog {
  id: number;
  time: string;
  type: string;
  stake: number;
  result: 'win' | 'loss' | 'pending';
  profit: number;
}

const SYMBOLS = [
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
  { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
  { value: 'R_100', label: 'Volatility 100 Index' },
  { value: 'R_50', label: 'Volatility 50 Index' },
  { value: 'CRASH500', label: 'Crash 500 Index' },
  { value: 'BOOM500', label: 'Boom 500 Index' },
];

const CONTRACT_TYPES: { value: ContractType; label: string; color: string }[] = [
  { value: 'DIGITODD', label: 'Digit ODD', color: '#f97316' },
  { value: 'DIGITEVEN', label: 'Digit EVEN', color: '#3b82f6' },
  { value: 'DIGITOVER', label: 'Digit OVER', color: '#22c55e' },
  { value: 'DIGITUNDER', label: 'Digit UNDER', color: '#a855f7' },
  { value: 'CALL', label: 'Rise (CALL)', color: '#10b981' },
  { value: 'PUT', label: 'Fall (PUT)', color: '#f43f5e' },
];

const STRATEGIES: { value: StrategyType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'fixed', label: 'Fixed Stake', desc: 'Same stake every trade', icon: <Settings size={16} /> },
  { value: 'martingale', label: 'Martingale', desc: 'Double on loss', icon: <TrendingUp size={16} /> },
  { value: 'dalembert', label: "D'Alembert", desc: 'Increment on loss', icon: <Activity size={16} /> },
  { value: 'fibonacci', label: 'Fibonacci', desc: 'Follow Fibonacci sequence', icon: <BarChart2 size={16} /> },
];

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

const defaultConfig: BotConfig = {
  name: 'Auto Trend Strategy',
  symbol: '1HZ25V',
  contractType: 'DIGITODD',
  stake: '1',
  duration: '1',
  takeProfit: '10',
  stopLoss: '20',
  maxTrades: '100',
  strategy: 'martingale',
  strategyParam: '2',
  barrier: '5',
};

export default function BotBuilder({ wsToken, wsUrl }: { wsToken?: string | null; wsUrl?: string | null }) {
  const [mode, setMode] = useState<'embedded' | 'native'>('native');
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'info' | 'win' | 'loss' | 'error'>('idle');
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, totalProfit: 0, trades: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const currentStake = useRef(0);
  const fibIndex = useRef(0);
  const totalLoss = useRef(0);
  const totalProfit = useRef(0);
  const logId = useRef(0);
  const tradeCount = useRef(0);
  const isRunning = useRef(false);

  // Fallback spinner timeout for embedded mode
  useEffect(() => {
    if (mode === 'embedded') {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const set = (key: keyof BotConfig) => (v: string) => setConfig(c => ({ ...c, [key]: v }));

  const setStatus_ = (msg: string, type: 'idle' | 'info' | 'win' | 'loss' | 'error' = 'info') => {
    setStatus(msg);
    setStatusType(type);
  };

  const addLog = (result: 'win' | 'loss' | 'pending', stake: number, profit: number) => {
    const log: TradeLog = {
      id: ++logId.current,
      time: new Date().toLocaleTimeString(),
      type: config.contractType,
      stake, result, profit,
    };
    setLogs(l => [log, ...l.slice(0, 49)]);
  };

  const nextStake = useCallback((lastResult: 'win' | 'loss') => {
    const base = parseFloat(config.stake);
    const param = parseFloat(config.strategyParam);
    if (lastResult === 'win') {
      fibIndex.current = 0;
      currentStake.current = base;
    } else {
      switch (config.strategy) {
        case 'fixed': currentStake.current = base; break;
        case 'martingale': currentStake.current = parseFloat((currentStake.current * param).toFixed(2)); break;
        case 'dalembert': currentStake.current = parseFloat((currentStake.current + param).toFixed(2)); break;
        case 'fibonacci':
          fibIndex.current = Math.min(fibIndex.current + 1, FIB.length - 1);
          currentStake.current = parseFloat((base * FIB[fibIndex.current]).toFixed(2));
          break;
      }
    }
  }, [config.stake, config.strategyParam, config.strategy]);

  const stopBot = useCallback((reason?: string) => {
    isRunning.current = false;
    setRunning(false);
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setStatus_(reason || '🛑 Bot stopped.', 'idle');
  }, []);

  const placeTrade = useCallback((ws: WebSocket) => {
    if (!isRunning.current) return;
    const stake = currentStake.current;
    const payload: Record<string, unknown> = {
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: 'stake',
        contract_type: config.contractType,
        currency: 'USD',
        duration: parseInt(config.duration),
        duration_unit: 't',
        symbol: config.symbol,
      },
    };
    if (config.contractType === 'DIGITOVER' || config.contractType === 'DIGITUNDER') {
      (payload.parameters as Record<string, unknown>).barrier = config.barrier;
    }
    ws.send(JSON.stringify(payload));
    setStatus_(`⚡ Placing ${config.contractType} on ${config.symbol} — Stake: $${stake.toFixed(2)}`, 'info');
  }, [config]);

  const startBot = useCallback(() => {
    if (!wsToken || !wsUrl) {
      setStatus_('❌ Please connect your Deriv trading account to run bots live.', 'error');
      return;
    }
    currentStake.current = parseFloat(config.stake);
    fibIndex.current = 0;
    totalLoss.current = 0;
    totalProfit.current = 0;
    tradeCount.current = 0;
    logId.current = 0;
    isRunning.current = true;
    setStats({ wins: 0, losses: 0, totalProfit: 0, trades: 0 });
    setLogs([]);
    setRunning(true);
    setStatus_('🔌 Connecting to Deriv WebSocket...', 'info');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus_('🔑 Authorizing account...', 'info');
      ws.send(JSON.stringify({ authorize: wsToken }));
    };

    ws.onmessage = (evt) => {
      if (!isRunning.current) return;
      try {
        const data = JSON.parse(evt.data);
        if (data.msg_type === 'authorize') {
          setStatus_('✅ Authorized! Starting trading bot execution...', 'info');
          setTimeout(() => placeTrade(ws), 500);
        }
        if (data.msg_type === 'buy') {
          if (data.error) {
            setStatus_(`❌ ${data.error.message}`, 'error');
            stopBot();
            return;
          }
          tradeCount.current++;
          const maxTrades = parseInt(config.maxTrades);
          const profit = parseFloat(data.buy?.profit ?? 0);
          const stake = currentStake.current;

          if (profit > 0) {
            totalProfit.current += profit;
            addLog('win', stake, profit);
            setStats(s => ({ wins: s.wins + 1, losses: s.losses, totalProfit: totalProfit.current, trades: tradeCount.current }));
            setStatus_(`🎉 WIN! +$${profit.toFixed(2)} | Net: $${totalProfit.current.toFixed(2)}`, 'win');
            if (totalProfit.current >= parseFloat(config.takeProfit)) {
              stopBot(`🎉 Take Profit reached! +$${totalProfit.current.toFixed(2)}`);
              return;
            }
            nextStake('win');
          } else {
            const loss = Math.abs(profit) || stake * 0.9;
            totalLoss.current += loss;
            totalProfit.current -= loss;
            addLog('loss', stake, -loss);
            setStats(s => ({ wins: s.wins, losses: s.losses + 1, totalProfit: totalProfit.current, trades: tradeCount.current }));
            setStatus_(`❌ LOSS -$${loss.toFixed(2)} | Net: $${totalProfit.current.toFixed(2)}`, 'loss');
            if (totalLoss.current >= parseFloat(config.stopLoss)) {
              stopBot(`🛑 Stop Loss hit! -$${totalLoss.current.toFixed(2)}`);
              return;
            }
            nextStake('loss');
          }

          if (tradeCount.current >= maxTrades) {
            stopBot(`✅ Max trades (${maxTrades}) reached.`);
            return;
          }
          setTimeout(() => placeTrade(ws), 800);
        }
      } catch { /* ignore */ }
    };
    ws.onerror = () => { setStatus_('❌ Connection error', 'error'); stopBot(); };
  }, [wsToken, wsUrl, config, placeTrade, stopBot, nextStake]);

  const targetUrl = wsToken
    ? `https://app.deriv.com/bot?token=${wsToken}&app_id=36544`
    : `https://bot.deriv.com?app_id=36544`;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4.5rem)] bg-gray-50 overflow-hidden">
      {/* Navigation & Mode Selector Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Bot size={16} />
          </div>
          <span className="font-bold text-gray-900 text-sm">Bot Builder</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-semibold">
            <button
              onClick={() => setMode('native')}
              className={`px-3 py-1 rounded-md transition-all ${mode === 'native' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Native Builder
            </button>
            <button
              onClick={() => { setMode('embedded'); setLoading(true); }}
              className={`px-3 py-1 rounded-md transition-all ${mode === 'embedded' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Deriv Web Bot
            </button>
          </div>

          <a
            href="https://bot.deriv.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
          >
            <span>External</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {mode === 'embedded' ? (
        <div className="relative w-full flex-1 overflow-hidden bg-white">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-gray-400">Loading Bot Builder…</p>
            </div>
          )}
          <iframe
            src={targetUrl}
            title="Bot Builder"
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            allow="clipboard-write; camera; geolocation"
          />
        </div>
      ) : (
        /* Native Builder Layout */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-5xl mx-auto w-full">
          {/* Status & Stats Banner */}
          {status && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusType === 'win' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              statusType === 'loss' ? 'bg-red-50 border-red-200 text-red-800' :
              statusType === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <Activity size={14} />
              <span className="flex-1">{status}</span>
            </div>
          )}

          {stats.trades > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Trades</p>
                <p className="text-sm font-bold text-gray-900">{stats.trades}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Wins</p>
                <p className="text-sm font-bold text-emerald-600">{stats.wins}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Losses</p>
                <p className="text-sm font-bold text-red-500">{stats.losses}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Net P/L</p>
                <p className={`text-sm font-bold ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  ${stats.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Builder Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strategy Configuration */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} className="text-emerald-500" /> Market & Strategy
              </h3>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Market Symbol</label>
                <select
                  value={config.symbol}
                  onChange={e => set('symbol')(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-400"
                >
                  {SYMBOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Contract Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONTRACT_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      onClick={() => set('contractType')(ct.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        config.contractType === ct.value ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Money Management Strategy</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STRATEGIES.map(st => (
                    <button
                      key={st.value}
                      onClick={() => set('strategy')(st.value)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        config.strategy === st.value ? 'bg-emerald-50 border-emerald-500' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-xs font-bold text-gray-800">{st.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">{st.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk & Parameters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Settings size={14} className="text-emerald-500" /> Stake & Risk Controls
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Initial Stake ($)</label>
                  <input
                    type="number"
                    value={config.stake}
                    onChange={e => set('stake')(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Duration (Ticks)</label>
                  <input
                    type="number"
                    value={config.duration}
                    onChange={e => set('duration')(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Take Profit ($)</label>
                  <input
                    type="number"
                    value={config.takeProfit}
                    onChange={e => set('takeProfit')(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    value={config.stopLoss}
                    onChange={e => set('stopLoss')(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {config.strategy !== 'fixed' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Strategy Multiplier (×)</label>
                  <input
                    type="number"
                    value={config.strategyParam}
                    onChange={e => set('strategyParam')(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              <div className="pt-2">
                {running ? (
                  <button
                    onClick={() => stopBot()}
                    className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-md transition-all text-xs animate-pulse"
                  >
                    <Square size={16} /> Stop Bot
                  </button>
                ) : (
                  <button
                    onClick={startBot}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all text-xs"
                  >
                    <Play size={16} /> Run Bot Strategy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Trade Execution Log */}
          {logs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trade History</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {logs.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${l.result === 'win' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="font-bold text-gray-800">{l.type}</span>
                      <span className="text-gray-400">{l.time}</span>
                    </div>
                    <span className={`font-bold ${l.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {l.profit >= 0 ? '+' : ''}${l.profit.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
