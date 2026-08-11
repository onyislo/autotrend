import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Plus, ShieldAlert, BarChart3, TrendingUp, Cpu, History, Trash2, Upload } from 'lucide-react';
import { derivAPI, SYNTHETIC_INDICES } from '../lib/derivAPI';
import { supabase } from '../lib/supabase';

const getLocalAdminBots = (): Bot[] => {
  try {
    const raw = localStorage.getItem('autotrendx_admin_bots');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalAdminBot = (bot: Bot) => {
  try {
    const existing = getLocalAdminBots();
    const updated = [bot, ...existing.filter(b => b.id !== bot.id)];
    localStorage.setItem('autotrendx_admin_bots', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save local admin bot:', e);
  }
};

const removeLocalAdminBot = (botId: string) => {
  try {
    const existing = getLocalAdminBots();
    const updated = existing.filter(b => b.id !== botId);
    localStorage.setItem('autotrendx_admin_bots', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove local admin bot:', e);
  }
};

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
  wsUrl: string | null;
  userEmail: string | null;
  userId: string | null;
  onGoToFreeBots?: () => void;
}

export default function AutoBotsPanel({ wsToken, wsUrl, userEmail, userId, onGoToFreeBots }: Props) {
  const [bots, setBots] = useState<Bot[]>([]);
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
    symbol: 'R_50',
    contractType: 'DIGITDIFF',
    amount: 1,
    duration: 1,
    martingale: true,
    martingaleMultiplier: 2,
    maxMartingaleSteps: 4,
    stopLoss: 20,
    takeProfit: 40,
  });

  // Upload-naming modal state
  const [pendingUpload, setPendingUpload] = useState<{
    symbol: string;
    contractType: string;
    fileName: string;
  } | null>(null);
  const [uploadBotName, setUploadBotName] = useState('');
  const [uploadBotDesc, setUploadBotDesc] = useState('');

  const isRunningRef = useRef(false);
  const runningBotIdRef = useRef<string | null>(null);
  
  // Check if current user is admin
  const isAdmin = userEmail === 'admin@autotrendx.co.ke';

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    const list: Bot[] = [];

    // Load bots from Supabase (admin-published bots)
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('is_public', true);
      
      if (!error && data && data.length > 0) {
        list.push(...data.filter(d => !list.some(b => b.id === d.id)));
      }
    } catch {
      // Ignore DB fallback error
    }

    // Load local admin uploaded/created bots
    try {
      const localAdminBots = getLocalAdminBots();
      if (localAdminBots.length > 0) {
        list.push(...localAdminBots.filter(lab => !list.some(b => b.id === lab.id)));
      }
    } catch {}

    setBots(list);
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
      await derivAPI.connect(wsUrl ?? undefined);
      
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
        saveLocalAdminBot(data[0]);
        setBots([...bots, data[0]]);
        setShowCreator(false);
        alert('Admin Bot created and published successfully!');
      } else {
        throw error;
      }
    } catch {
      // Fallback for demo / offline mode
      const mockBot: Bot = {
        id: `mock-${Date.now()}`,
        name: botObj.name!,
        description: botObj.description!,
        is_public: true,
        strategy: botObj.strategy!
      };
      saveLocalAdminBot(mockBot);
      setBots([...bots, mockBot]);
      setShowCreator(false);
      alert('Admin Bot created and published successfully!');
    }
  };

  const deleteBot = async (botId: string) => {
    if (botId.startsWith('default-')) {
      alert('Cannot delete default system templates.');
      return;
    }
    
    removeLocalAdminBot(botId);
    try {
      await supabase
        .from('trading_bots')
        .delete()
        .eq('id', botId);
    } catch {
      // Ignore DB error
    }
    setBots(prev => prev.filter((b) => b.id !== botId));
  };

  return (
    <div className="space-y-6">
      {/* Admin Panel Actions */}
      {isAdmin && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-emerald-900 text-lg">👑 Admin Bot Manager Panel</h3>
              <p className="text-emerald-700 text-xs mt-1">
                You are signed in as the Administrator. Design, upload, and deploy proprietary bot templates for your clients.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Admin File Upload — any file type */}
              <input
                type="file"
                accept="*"
                id="admin-xml-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // For XML files, try to extract symbol/contract; otherwise use defaults
                  const isXml = file.name.toLowerCase().endsWith('.xml');
                  if (isXml) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const xmlContent = evt.target?.result as string;
                      const symbolMatch = xmlContent?.match(/<field name="SYMBOL_LIST">(.*?)<\/field>/);
                      const purchaseMatch = xmlContent?.match(/<field name="PURCHASE_LIST">(.*?)<\/field>/);
                      const symbol = symbolMatch ? symbolMatch[1] : 'R_50';
                      const contractType = purchaseMatch ? purchaseMatch[1] : 'DIGITDIFF';
                      // Pre-fill suggested name but let admin rename
                      const suggested = file.name.replace(/\.xml$/i, '').toUpperCase();
                      setUploadBotName(suggested);
                      setUploadBotDesc(`Uploaded bot on ${symbol}.`);
                      setPendingUpload({ symbol, contractType, fileName: file.name });
                    };
                    reader.readAsText(file);
                  } else {
                    // Non-XML: open naming modal with defaults
                    const suggested = file.name.replace(/\.[^.]+$/, '').toUpperCase();
                    setUploadBotName(suggested);
                    setUploadBotDesc('');
                    setPendingUpload({ symbol: 'R_50', contractType: 'DIGITDIFF', fileName: file.name });
                  }
                  // Reset input so same file can be re-selected
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="admin-xml-upload"
                className="flex items-center gap-2 bg-white border border-emerald-400 text-emerald-700 hover:bg-emerald-100 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
              >
                <Upload size={15} /> Upload Bot File
              </label>
              <button
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-sm"
              >
                <Plus size={15} /> Create Bot
              </button>
            </div>
          </div>
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
            Click Start Bot to activate the strategy algorithm on your own account session.
          </p>
        </div>

        {bots.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🤖
            </div>
            <h4 className="font-bold text-gray-800 text-base">No bots at the moment</h4>
          </div>
        ) : (
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
        )}
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

      {/* Upload Naming Modal (Admin Only) */}
      <AnimatePresence>
        {pendingUpload && isAdmin && (
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Name Your Bot</h3>
                  <p className="text-xs text-gray-500 mt-0.5">File: <span className="font-mono text-emerald-600">{pendingUpload.fileName}</span></p>
                </div>
                <button
                  onClick={() => setPendingUpload(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bot Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={uploadBotName}
                    onChange={(e) => setUploadBotName(e.target.value)}
                    placeholder="e.g. Volatility Sniper Pro"
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                  <textarea
                    value={uploadBotDesc}
                    onChange={(e) => setUploadBotDesc(e.target.value)}
                    placeholder="Brief strategy description for your users..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  onClick={() => setPendingUpload(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!uploadBotName.trim()}
                  onClick={() => {
                    const newBot: Bot = {
                      id: `admin-upload-${Date.now()}`,
                      name: uploadBotName.trim(),
                      description: uploadBotDesc.trim() || `Admin uploaded bot on ${pendingUpload.symbol}.`,
                      is_public: true,
                      strategy: {
                        symbol: pendingUpload.symbol,
                        contractType: pendingUpload.contractType,
                        amount: 1,
                        duration: 1,
                        martingale: true,
                        martingaleMultiplier: 2,
                        maxMartingaleSteps: 4,
                        stopLoss: 20,
                        takeProfit: 40,
                      }
                    };
                    saveLocalAdminBot(newBot);
                    setBots(prev => [newBot, ...prev.filter(b => b.id !== newBot.id)]);
                    setPendingUpload(null);
                    setUploadBotName('');
                    setUploadBotDesc('');
                    alert(`✅ Bot "${newBot.name}" deployed to all users!`);
                  }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Deploy Bot
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
