import { useState, useRef, useCallback } from 'react';
import {
  Play, Square, Plus, Trash2, ChevronDown, ChevronUp,
  Bot, Zap, TrendingUp, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Activity, Settings, BarChart2
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
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
  strategyParam: string; // multiplier for martingale, unit for dalembert
  barrier: string; // for OVER/UNDER
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
  { value: 'R_100', label: 'Volatility 100 Index' },
  { value: 'R_75', label: 'Volatility 75 Index' },
  { value: 'R_50', label: 'Volatility 50 Index' },
  { value: 'R_25', label: 'Volatility 25 Index' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
  { value: 'CRASH500', label: 'Crash 500 Index' },
  { value: 'CRASH1000', label: 'Crash 1000 Index' },
  { value: 'BOOM500', label: 'Boom 500 Index' },
  { value: 'BOOM1000', label: 'Boom 1000 Index' },
];

const CONTRACT_TYPES: { value: ContractType; label: string; color: string }[] = [
  { value: 'DIGITODD', label: 'Digit ODD', color: '#f97316' },
  { value: 'DIGITEVEN', label: 'Digit EVEN', color: '#3b82f6' },
  { value: 'DIGITOVER', label: 'Digit OVER', color: '#22c55e' },
  { value: 'DIGITUNDER', label: 'Digit UNDER', color: '#a855f7' },
  { value: 'DIGITDIFF', label: 'Digit DIFFERS', color: '#ef4444' },
  { value: 'DIGITMATCH', label: 'Digit MATCHES', color: '#eab308' },
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
  name: 'My Strategy Bot',
  symbol: 'R_100',
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

// ── Block Card ─────────────────────────────────────────────────────────────────
function BlockCard({
  title, color, icon, children, collapsible = false
}: {
  title: string; color: string; icon: React.ReactNode; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none"
        style={{ background: color }}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <span className="text-white">{icon}</span>
        <span className="text-white font-bold text-sm flex-1">{title}</span>
        {collapsible && (
          <span className="text-white/80">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </div>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function InputField({ value, onChange, type = 'text', min, step, placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; min?: string; step?: string; placeholder?: string;
}) {
  return (
    <input
      type={type} min={min} step={step} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
    />
  );
}

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Main BotBuilder ────────────────────────────────────────────────────────────
export default function BotBuilder({ wsToken, wsUrl }: { wsToken: string | null; wsUrl: string | null }) {
  const [config, setConfig] = useState<BotConfig>(defaultConfig);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'info' | 'win' | 'loss' | 'error'>('idle');
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, totalProfit: 0, trades: 0 });
  const [activeSection, setActiveSection] = useState<'build' | 'logs'>('build');

  const wsRef = useRef<WebSocket | null>(null);
  const currentStake = useRef(0);
  const fibIndex = useRef(0);
  const consecutiveLosses = useRef(0);
  const totalLoss = useRef(0);
  const totalProfit = useRef(0);
  const logId = useRef(0);
  const tradeCount = useRef(0);
  const isRunning = useRef(false);

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
      consecutiveLosses.current = 0;
      fibIndex.current = 0;
      currentStake.current = base;
    } else {
      consecutiveLosses.current++;
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
    setStatus_(`⚡ Placing ${config.contractType} on ${SYMBOLS.find(s => s.value === config.symbol)?.label} — Stake: $${stake.toFixed(2)}`, 'info');
  }, [config]);

  const stopBot = useCallback((reason?: string) => {
    isRunning.current = false;
    setRunning(false);
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setStatus_(reason || '🛑 Bot stopped.', 'idle');
  }, []);

  const startBot = useCallback(() => {
    if (!wsToken || !wsUrl) {
      setStatus_('❌ Not authenticated. Please login again.', 'error');
      return;
    }
    // Reset state
    currentStake.current = parseFloat(config.stake);
    fibIndex.current = 0;
    consecutiveLosses.current = 0;
    totalLoss.current = 0;
    totalProfit.current = 0;
    tradeCount.current = 0;
    logId.current = 0;
    isRunning.current = true;
    setStats({ wins: 0, losses: 0, totalProfit: 0, trades: 0 });
    setLogs([]);
    setRunning(true);
    setStatus_('🔌 Connecting to Deriv...', 'info');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus_('🔑 Authorizing...', 'info');
      ws.send(JSON.stringify({ authorize: wsToken }));
    };

    ws.onmessage = (evt) => {
      if (!isRunning.current) return;
      const data = JSON.parse(evt.data);

      if (data.msg_type === 'authorize') {
        setStatus_('✅ Authorized. Starting first trade...', 'info');
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
          // WIN
          totalProfit.current += profit;
          addLog('win', stake, profit);
          setStats(s => ({ wins: s.wins + 1, losses: s.losses, totalProfit: totalProfit.current, trades: tradeCount.current }));
          setStatus_(`🎉 WIN! +$${profit.toFixed(2)} | Total: $${totalProfit.current.toFixed(2)}`, 'win');

          if (totalProfit.current >= parseFloat(config.takeProfit)) {
            stopBot(`🎉 Take Profit reached! +$${totalProfit.current.toFixed(2)}`);
            return;
          }
          nextStake('win');
        } else {
          // LOSS
          const loss = Math.abs(profit) || stake * 0.9; // approx loss
          totalLoss.current += loss;
          totalProfit.current -= loss;
          addLog('loss', stake, -loss);
          setStats(s => ({ wins: s.wins, losses: s.losses + 1, totalProfit: totalProfit.current, trades: tradeCount.current }));
          setStatus_(`❌ LOSS -$${loss.toFixed(2)} | Total: $${totalProfit.current.toFixed(2)}`, 'loss');

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
    };

    ws.onerror = () => { setStatus_('❌ Connection error', 'error'); stopBot(); };
    ws.onclose = () => { if (isRunning.current) { setStatus_('⚠️ Connection closed', 'error'); stopBot(); } };
  }, [wsToken, wsUrl, config, placeTrade, stopBot, nextStake]);

  const contractColor = CONTRACT_TYPES.find(c => c.value === config.contractType)?.color ?? '#6366f1';
  const profitColor = stats.totalProfit >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Bot Builder</h2>
            <p className="text-xs text-gray-500">Build your strategy visually and run it live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection(s => s === 'build' ? 'logs' : 'build')}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors"
          >
            <Activity size={14} />
            {activeSection === 'build' ? 'View Logs' : 'Edit Strategy'}
          </button>
          {running ? (
            <button onClick={() => stopBot()}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all animate-pulse"
            >
              <Square size={16} /> Stop Bot
            </button>
          ) : (
            <button onClick={startBot}
              className="flex items-center gap-2 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
            >
              <Play size={16} /> Run Bot
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium"
          style={{
            background: statusType === 'win' ? '#f0fdf4' : statusType === 'loss' ? '#fff1f2' : statusType === 'error' ? '#fff1f2' : '#f0f9ff',
            borderColor: statusType === 'win' ? '#86efac' : statusType === 'loss' ? '#fecdd3' : statusType === 'error' ? '#fecdd3' : '#bae6fd',
            color: statusType === 'win' ? '#166534' : statusType === 'loss' ? '#9f1239' : statusType === 'error' ? '#9f1239' : '#0c4a6e',
          }}
        >
          {statusType === 'win' ? <CheckCircle size={16} /> : statusType === 'loss' || statusType === 'error' ? <XCircle size={16} /> : <Activity size={16} />}
          <span className="flex-1">{status}</span>
          {running && <span className="w-2 h-2 bg-current rounded-full animate-pulse ml-auto" />}
        </div>
      )}

      {/* Stats Bar (when running or has trades) */}
      {stats.trades > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Trades', val: stats.trades, color: '#6366f1' },
            { label: 'Wins', val: stats.wins, color: '#10b981' },
            { label: 'Losses', val: stats.losses, color: '#ef4444' },
            { label: 'Net P/L', val: `$${stats.totalProfit.toFixed(2)}`, color: profitColor },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">{s.label}</p>
              <p className="font-bold text-lg" style={{ color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'build' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Block 1: Market & Contract */}
          <BlockCard title="Market & Contract" color="#6366f1" icon={<TrendingUp size={16} />}>
            <Field label="Bot Name">
              <InputField value={config.name} onChange={set('name')} placeholder="My Strategy" />
            </Field>
            <Field label="Market">
              <SelectField value={config.symbol} onChange={set('symbol')} options={SYMBOLS} />
            </Field>
            <Field label="Contract Type">
              <div className="grid grid-cols-2 gap-1.5">
                {CONTRACT_TYPES.map(ct => (
                  <button key={ct.value} onClick={() => set('contractType')(ct.value)}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
                    style={{
                      borderColor: config.contractType === ct.value ? ct.color : '#e5e7eb',
                      background: config.contractType === ct.value ? ct.color + '15' : 'transparent',
                      color: config.contractType === ct.value ? ct.color : '#6b7280',
                    }}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </Field>
            {(config.contractType === 'DIGITOVER' || config.contractType === 'DIGITUNDER') && (
              <Field label="Barrier (0-9)">
                <InputField value={config.barrier} onChange={set('barrier')} type="number" min="0" />
              </Field>
            )}
          </BlockCard>

          {/* Block 2: Trade Settings */}
          <BlockCard title="Trade Settings" color="#f59e0b" icon={<Settings size={16} />}>
            <Field label="Stake ($)">
              <InputField value={config.stake} onChange={set('stake')} type="number" min="0.35" step="0.01" />
            </Field>
            <Field label="Duration (ticks)">
              <InputField value={config.duration} onChange={set('duration')} type="number" min="1" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Take Profit ($)">
                <InputField value={config.takeProfit} onChange={set('takeProfit')} type="number" min="0" step="0.5" />
              </Field>
              <Field label="Stop Loss ($)">
                <InputField value={config.stopLoss} onChange={set('stopLoss')} type="number" min="0" step="0.5" />
              </Field>
            </div>
            <Field label="Max Trades">
              <InputField value={config.maxTrades} onChange={set('maxTrades')} type="number" min="1" />
            </Field>
          </BlockCard>

          {/* Block 3: Strategy */}
          <BlockCard title="Strategy" color="#10b981" icon={<Zap size={16} />}>
            <Field label="Strategy Type">
              <div className="space-y-2">
                {STRATEGIES.map(s => (
                  <button key={s.value} onClick={() => set('strategy')(s.value)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: config.strategy === s.value ? '#10b981' : '#e5e7eb',
                      background: config.strategy === s.value ? '#f0fdf4' : 'transparent',
                    }}
                  >
                    <span style={{ color: config.strategy === s.value ? '#10b981' : '#9ca3af' }}>{s.icon}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: config.strategy === s.value ? '#065f46' : '#374151' }}>{s.label}</p>
                      <p className="text-xs" style={{ color: config.strategy === s.value ? '#059669' : '#9ca3af' }}>{s.desc}</p>
                    </div>
                    {config.strategy === s.value && (
                      <CheckCircle size={16} className="ml-auto" style={{ color: '#10b981' }} />
                    )}
                  </button>
                ))}
              </div>
            </Field>
            {config.strategy !== 'fixed' && config.strategy !== 'fibonacci' && (
              <Field label={config.strategy === 'martingale' ? 'Multiplier (×)' : 'Increment ($)'}>
                <InputField value={config.strategyParam} onChange={set('strategyParam')} type="number" min="1" step="0.1" />
              </Field>
            )}
            {/* Visual strategy preview */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Stake Progression Preview</p>
              <div className="flex items-end gap-1 h-10">
                {Array.from({ length: 8 }, (_, i) => {
                  const base = parseFloat(config.stake) || 1;
                  const param = parseFloat(config.strategyParam) || 2;
                  let h = base;
                  if (config.strategy === 'martingale') h = base * Math.pow(param, i);
                  else if (config.strategy === 'dalembert') h = base + param * i;
                  else if (config.strategy === 'fibonacci') h = base * FIB[Math.min(i, FIB.length - 1)];
                  const max = config.strategy === 'martingale' ? base * Math.pow(param, 7) : config.strategy === 'fibonacci' ? base * 21 : base + param * 7;
                  const pct = Math.min((h / (max || 1)) * 100, 100);
                  return (
                    <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(pct, 8)}%`, background: `hsl(${160 - i * 15}, 70%, 50%)` }} />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">Trade 1</span>
                <span className="text-xs text-gray-400">Trade 8</span>
              </div>
            </div>
          </BlockCard>
        </div>
      ) : (
        /* ── Logs View ──────────────────────────────────────────────────────────── */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-gray-500" />
              <span className="font-bold text-gray-800 text-sm">Trade Log</span>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{logs.length}</span>
            </div>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                <Activity size={28} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No trades yet</p>
              <p className="text-xs text-gray-400 mt-1">Run the bot to see trade results here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: log.result === 'win' ? '#f0fdf4' : '#fff1f2' }}
                  >
                    {log.result === 'win'
                      ? <CheckCircle size={16} className="text-emerald-500" />
                      : <XCircle size={16} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{log.type}</p>
                    <p className="text-xs text-gray-400">{log.time} · Stake: ${log.stake.toFixed(2)}</p>
                  </div>
                  <span className="font-bold text-sm" style={{ color: log.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    {log.profit >= 0 ? '+' : ''}{log.profit.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      {!wsToken && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">You are not authenticated. Please logout and login again to run the bot.</p>
        </div>
      )}

      {/* Run button (bottom) */}
      {activeSection === 'build' && (
        <div className="flex justify-center pb-4">
          {running ? (
            <button onClick={() => stopBot()}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg transition-all text-base animate-pulse"
            >
              <Square size={18} /> Stop Bot
            </button>
          ) : (
            <button onClick={startBot}
              className="flex items-center gap-2 text-white font-bold px-8 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 text-base"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
            >
              <Play size={18} /> Run Bot
            </button>
          )}
        </div>
      )}
    </div>
  );
}
