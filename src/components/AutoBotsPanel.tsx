import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, ShieldAlert, BarChart3, TrendingUp, Cpu, History, Trash2 } from 'lucide-react';
import { derivAPI, SYNTHETIC_INDICES } from '../lib/derivAPI';
import { supabase } from '../lib/supabase';

interface BotStrategy {
  symbol: string;
  contractType: string;
  amount: number;
  duration: number;
  martingale: boolean;
  martingaleMultiplier: number;
  maxMartingaleSteps: number;
  stopLoss: number;
  takeProfit: number;
}

interface Bot {
  id: string;
  name: string;
  description: string;
  strategy: BotStrategy;
  is_public: boolean;
  user_id?: string;
  created_at?: string;
}

interface LogEntry {
  time: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface Props {
  wsToken: string | null;
  userEmail: string | null;
  userId: string | null;
}

// Fallback premium bots pre-loaded in the code in case the database isn't fully migrated yet
const DEFAULT_BOTS: Bot[] = [
  {
    id: 'default-martingale-v75',
    name: 'Admin Martingale (Volatility 75)',
    description: 'Proprietary trend-following martingale strategy. Automatically doubles stake on loss to secure recovery.',
    is_public: true,
    strategy: {
      symbol: 'R_75',
      contractType: 'CALL',
      amount: 1,
      duration: 5,
      martingale: true,
      martingaleMultiplier: 2,
      maxMartingaleSteps: 4,
      stopLoss: 25,
      takeProfit: 50,
    }
  },
  {
    id: 'default-digit-scalper',
    name: 'Admin Volatility 100 Scalper',
    description: 'High-speed scalp trades targeting short momentum shifts. Ideal for volatile market sweeps.',
    is_public: true,
    strategy: {
      symbol: 'R_100',
      contractType: 'PUT',
      amount: 2,
      duration: 5,
      martingale: true,
      martingaleMultiplier: 1.8,
      maxMartingaleSteps: 3,
      stopLoss: 30,
      takeProfit: 60,
    }
  }
];

export default function AutoBotsPanel({ wsToken, userEmail, userId }: Props) {
  const [bots, setBots] = useState<Bot[]>(DEFAULT_BOTS);
  const [activeBot, setActiveBot] = useState<Bot | null>(null);
  const [runningBotId, setRunningBotId] = useState<string | null>(null);
  
  // Bot Runner states
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    netProfit: 0,
  });
  
  const [showCreator, setShowCreator] = useState(false);
  const [newBotData, setNewBotData] = useState({
    name: '',
    description: '',
    symbol: 'R_75',
    contractType: 'CALL',
    amount: 1,
    duration: 5,
    martingale: true,
    martingaleMultiplier: 2,
    maxMartingaleSteps: 4,
    stopLoss: 20,
    takeProfit: 40,
  });

  const isRunningRef = useRef(false);
  const runningBotIdRef = useRef<string | null>(null);
  
  // Check if current user is admin
  const isAdmin = userEmail === 'bradeyonyiso@gmail.com';

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('is_public', true);
      
      if (!error && data && data.length > 0) {
        setBots([...DEFAULT_BOTS, ...data]);
      }
    } catch {
      // Fall back to DEFAULT_BOTS if table/policy doesn't exist yet
    }
  };

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, text, type }, ...prev].slice(0, 100));
  };

  const startBot = async (bot: Bot) => {
    if (!wsToken) {
      alert('Secure session is not initialized. Please refresh page.');
      return;
    }
    
    setRunningBotId(bot.id);
    runningBotIdRef.current = bot.id;
    isRunningRef.current = true;
    
    setLogs([]);
    setStats({ totalTrades: 0, wins: 0, losses: 0, netProfit: 0 });
    
    addLog(`Initializing ${bot.name}...`, 'info');
    
    // Execute trade loop in background
    runBotLoop(bot);
  };

  const stopBot = () => {
    isRunningRef.current = false;
    runningBotIdRef.current = null;
    setRunningBotId(null);
    addLog('Stop command received. Shutting down trading loop...', 'warning');
  };

  const runBotLoop = async (bot: Bot) => {
    const { strategy } = bot;
    let currentStake = strategy.amount;
    let consecutiveLosses = 0;
    let netProfit = 0;
    let winsCount = 0;
    let lossesCount = 0;
    let totalTradesCount = 0;

    try {
      addLog('Connecting to Deriv WebSocket API...', 'info');
      await derivAPI.connect();
      
      addLog('Authorizing secure session token...', 'info');
      await derivAPI.authorize(wsToken!);
      addLog('Authorization successful. Auto Bot loop is active!', 'success');

      while (isRunningRef.current && runningBotIdRef.current === bot.id) {
        // Check profit target or stop loss limits
        if (netProfit >= strategy.takeProfit) {
          addLog(`🎉 Take Profit target ($${strategy.takeProfit}) reached! Stopping bot.`, 'success');
          break;
        }
        if (netProfit <= -strategy.stopLoss) {
          addLog(`🚨 Stop Loss limit (-$${strategy.stopLoss}) hit! Stopping bot to protect capital.`, 'error');
          break;
        }

        addLog(`Placing trade: ${strategy.contractType} on ${strategy.symbol} with stake $${currentStake.toFixed(2)}`, 'info');
        
        // Buy contract
        let buyRes;
        try {
          buyRes = await derivAPI.buyContract(
            strategy.contractType,
            strategy.symbol,
            currentStake,
            strategy.duration
          );
        } catch (buyErr: any) {
          addLog(`Purchase failed: ${buyErr.message}. Retrying in 5 seconds...`, 'error');
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        const contractId = buyRes.buy.contract_id;
        const entryPrice = buyRes.buy.price;
        addLog(`Contract purchased! ID: ${contractId}. Polling trade resolution...`, 'info');

        // Poll contract resolution
        let isSettled = false;
        let finalProfit = 0;
        let pollAttempts = 0;

        while (!isSettled && isRunningRef.current) {
          await new Promise((r) => setTimeout(r, 1500));
          pollAttempts++;

          try {
            const info = await derivAPI.getContractInfo(contractId);
            const contract = info.proposal_open_contract;

            if (contract.is_expired || contract.status !== 'open') {
              isSettled = true;
              finalProfit = Number(contract.profit);
              break;
            }
          } catch {
            if (pollAttempts > 30) {
              addLog('Trade status lost. Assuming completion and resetting loop...', 'warning');
              isSettled = true;
              break;
            }
          }
        }

        if (!isRunningRef.current) {
          addLog('Bot stopped while trade was in progress.', 'warning');
          break;
        }

        // Process trade result
        totalTradesCount++;
        const isWin = finalProfit > 0;

        if (isWin) {
          winsCount++;
          netProfit += finalProfit;
          consecutiveLosses = 0;
          currentStake = strategy.amount; // reset stake on win
          addLog(`👍 WIN! Profit: +$${finalProfit.toFixed(2)} | Net: $${netProfit.toFixed(2)}`, 'success');
        } else {
          lossesCount++;
          netProfit += finalProfit; // finalProfit is negative for loss
          consecutiveLosses++;
          
          addLog(`👎 LOSS! Loss: $${finalProfit.toFixed(2)} | Net: $${netProfit.toFixed(2)}`, 'error');

          if (strategy.martingale && consecutiveLosses <= strategy.maxMartingaleSteps) {
            currentStake = currentStake * strategy.martingaleMultiplier;
            addLog(`Martingale active: Multiplied stake to $${currentStake.toFixed(2)} (Step ${consecutiveLosses})`, 'warning');
          } else {
            if (strategy.martingale) {
              addLog('Max Martingale Steps reached. Resetting stake to base amount.', 'warning');
            }
            consecutiveLosses = 0;
            currentStake = strategy.amount;
          }
        }

        // Update display stats
        setStats({
          totalTrades: totalTradesCount,
          wins: winsCount,
          losses: lossesCount,
          netProfit: netProfit
        });

        // Insert trade log in database (optional / best effort)
        if (userId) {
          try {
            await supabase.from('trades').insert([{
              user_id: userId,
              symbol: strategy.symbol,
              contract_type: strategy.contractType,
              type: strategy.contractType === 'CALL' ? 'buy' : 'sell',
              amount: currentStake,
              deriv_contract_id: String(contractId),
              profit_loss: finalProfit,
              status: 'closed',
              entry_price: entryPrice
            }]);
          } catch {
            // best-effort logging
          }
        }

        // Wait 2 seconds before next trade
        addLog('Waiting 2 seconds before next trigger...', 'info');
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err: any) {
      addLog(`Loop interrupted: ${err.message || err}`, 'error');
    } finally {
      isRunningRef.current = false;
      setRunningBotId(null);
      addLog('Bot loop terminated.', 'info');
      derivAPI.disconnect();
    }
  };

  const createAdminBot = async () => {
    if (!newBotData.name) return;

    const botObj: Partial<Bot> = {
      name: newBotData.name,
      description: newBotData.description,
      is_public: true,
      strategy: {
        symbol: newBotData.symbol,
        contractType: newBotData.contractType,
        amount: Number(newBotData.amount),
        duration: Number(newBotData.duration),
        martingale: newBotData.martingale,
        martingaleMultiplier: Number(newBotData.martingaleMultiplier),
        maxMartingaleSteps: Number(newBotData.maxMartingaleSteps),
        stopLoss: Number(newBotData.stopLoss),
        takeProfit: Number(newBotData.takeProfit),
      }
    };

    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .insert([{
          user_id: userId,
          name: botObj.name,
          description: botObj.description,
          strategy: botObj.strategy,
          is_public: true
        }])
        .select();

      if (!error && data) {
        setBots([...bots, data[0]]);
        setShowCreator(false);
        alert('Admin Bot uploaded successfully!');
      } else {
        throw error;
      }
    } catch {
      // Fallback for demo: add to state
      const mockBot: Bot = {
        id: `mock-${Date.now()}`,
        name: botObj.name!,
        description: botObj.description!,
        is_public: true,
        strategy: botObj.strategy!
      };
      setBots([...bots, mockBot]);
      setShowCreator(false);
      alert('Bot added to current session dashboard successfully!');
    }
  };

  const deleteBot = async (botId: string) => {
    if (botId.startsWith('default-')) {
      alert('Cannot delete default system templates.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('trading_bots')
        .delete()
        .eq('id', botId);
      
      if (!error) {
        setBots(bots.filter((b) => b.id !== botId));
      }
    } catch {
      setBots(bots.filter((b) => b.id !== botId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Panel Actions */}
      {isAdmin && (
        <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
          <div>
            <h3 className="font-bold text-emerald-900 text-lg">👑 Admin Bot Manager Panel</h3>
            <p className="text-emerald-700 text-xs mt-1">
              You are signed in as the Administrator. You can design, load, and deploy proprietary bot templates for your clients.
            </p>
          </div>
          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm"
          >
            <Plus size={16} /> Load Admin Bot
          </button>
        </div>
      )}

      {/* Bot Runner Live Console */}
      <AnimatePresence>
        {runningBotId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl text-white space-y-6"
          >
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <Cpu size={24} className="text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg">
                    {bots.find(b => b.id === runningBotId)?.name}
                  </h3>
                  <span className="text-xs text-emerald-400 font-medium tracking-wider uppercase">
                    🟢 Bot running on your account
                  </span>
                </div>
              </div>
              <button
                onClick={stopBot}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-md text-sm"
              >
                <Pause size={14} /> Stop Bot
              </button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Trades', value: stats.totalTrades, icon: History, color: 'text-blue-400' },
                { label: 'Wins', value: stats.wins, icon: TrendingUp, color: 'text-green-400' },
                { label: 'Losses', value: stats.losses, icon: ShieldAlert, color: 'text-red-400' },
                {
                  label: 'Net Profit/Loss',
                  value: `$${stats.netProfit.toFixed(2)}`,
                  icon: BarChart3,
                  color: stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-950 rounded-xl border border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Live Console Logs */}
            <div className="bg-black rounded-xl border border-gray-800 p-4 h-60 overflow-y-auto font-mono text-xs space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <span className="text-gray-600 shrink-0">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-gray-500 text-center py-10">Starting execution logs...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available bots card grid */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Available Trading Bots</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Click Start Bot to activate the proprietary algorithms on your own account session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                runningBotId === bot.id ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-gray-200'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800 text-base">{bot.name}</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold uppercase mt-1 inline-block">
                      Proprietary Bot
                    </span>
                  </div>
                  {isAdmin && !bot.id.startsWith('default-') && (
                    <button
                      onClick={() => deleteBot(bot.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Delete Bot"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">{bot.description}</p>

                {/* Strategy overview parameters */}
                <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-[10px] text-gray-600">
                  <div>
                    <span className="block text-gray-400 mb-0.5">Market</span>
                    <span className="font-bold font-mono">
                      {Object.keys(SYNTHETIC_INDICES).find(
                        (k) => SYNTHETIC_INDICES[k as keyof typeof SYNTHETIC_INDICES] === bot.strategy.symbol
                      )?.replace(' Index', '') || bot.strategy.symbol}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">Base Stake</span>
                    <span className="font-bold text-gray-900">${bot.strategy.amount}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">Contract</span>
                    <span className="font-bold text-emerald-600">{bot.strategy.contractType}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">Martingale</span>
                    <span className="font-bold text-gray-900">{bot.strategy.martingale ? `${bot.strategy.martingaleMultiplier}x` : 'Off'}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">Stop Loss</span>
                    <span className="font-bold text-red-500">${bot.strategy.stopLoss}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 mb-0.5">Take Profit</span>
                    <span className="font-bold text-green-600">${bot.strategy.takeProfit}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {runningBotId === bot.id ? (
                  <button
                    onClick={stopBot}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Stop Bot
                  </button>
                ) : (
                  <button
                    onClick={() => startBot(bot)}
                    disabled={!!runningBotId}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Start Auto Bot
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bot Creator Modal (Admin Only) */}
      <AnimatePresence>
        {showCreator && isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-gray-900 text-lg">Load Proprietary Admin Bot</h3>
                <button
                  onClick={() => setShowCreator(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bot Name</label>
                    <input
                      type="text"
                      value={newBotData.name}
                      onChange={(e) => setNewBotData({ ...newBotData, name: e.target.value })}
                      placeholder="e.g. Martingale Scalper V75"
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                    <textarea
                      value={newBotData.description}
                      onChange={(e) => setNewBotData({ ...newBotData, description: e.target.value })}
                      placeholder="Short description explaining the bot strategy to users..."
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm h-20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Market Symbol</label>
                    <select
                      value={newBotData.symbol}
                      onChange={(e) => setNewBotData({ ...newBotData, symbol: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    >
                      {Object.entries(SYNTHETIC_INDICES).map(([name, symbol]) => (
                        <option key={symbol} value={symbol}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contract Type</label>
                    <select
                      value={newBotData.contractType}
                      onChange={(e) => setNewBotData({ ...newBotData, contractType: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                    >
                      <option value="CALL">Rise (CALL)</option>
                      <option value="PUT">Fall (PUT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base Stake ($)</label>
                    <input
                      type="number"
                      value={newBotData.amount}
                      onChange={(e) => setNewBotData({ ...newBotData, amount: Number(e.target.value) })}
                      min={0.35}
                      step={0.01}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Ticks)</label>
                    <input
                      type="number"
                      value={newBotData.duration}
                      onChange={(e) => setNewBotData({ ...newBotData, duration: Number(e.target.value) })}
                      min={1}
                      max={10}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stop Loss ($)</label>
                    <input
                      type="number"
                      value={newBotData.stopLoss}
                      onChange={(e) => setNewBotData({ ...newBotData, stopLoss: Number(e.target.value) })}
                      min={1}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Take Profit ($)</label>
                    <input
                      type="number"
                      value={newBotData.takeProfit}
                      onChange={(e) => setNewBotData({ ...newBotData, takeProfit: Number(e.target.value) })}
                      min={1}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-2">
                    <label className="flex items-center gap-2 font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={newBotData.martingale}
                        onChange={(e) => setNewBotData({ ...newBotData, martingale: e.target.checked })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Enable Martingale Stake Recovery
                    </label>
                  </div>

                  {newBotData.martingale && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Multiplier</label>
                        <input
                          type="number"
                          value={newBotData.martingaleMultiplier}
                          onChange={(e) => setNewBotData({ ...newBotData, martingaleMultiplier: Number(e.target.value) })}
                          min={1.1}
                          step={0.1}
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Steps</label>
                        <input
                          type="number"
                          value={newBotData.maxMartingaleSteps}
                          onChange={(e) => setNewBotData({ ...newBotData, maxMartingaleSteps: Number(e.target.value) })}
                          min={1}
                          max={10}
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-4 border-t pt-4">
                <button
                  onClick={() => setShowCreator(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createAdminBot}
                  disabled={!newBotData.name}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm"
                >
                  Save & Publish Bot
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
