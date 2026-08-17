import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Plus, BarChart3, TrendingUp, Cpu, History, Trash2, Upload } from 'lucide-react';
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
  wsUrl: string | null;
  userEmail: string | null;
  userId: string | null;
  onGoToFreeBots?: () => void;
  onBalanceUpdate?: (profitDelta: number, newExactBalance?: number) => void;
}

export default function AutoBotsPanel({ wsToken, wsUrl, userEmail, userId, onGoToFreeBots, onBalanceUpdate }: Props) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [runningBotId, setRunningBotId] = useState<string | null>(null);
  
  // Bot Runner states
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const statsRef = useRef({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    netProfit: 0,
    totalProfit: 0,
    totalLoss: 0,
  });
  const [stats, setStats] = useState(statsRef.current);

  const updateStats = (newStats: typeof statsRef.current) => {
    statsRef.current = newStats;
    setStats(newStats);
  };

  // Trade result popup
  const [tradePopup, setTradePopup] = useState<{ type: 'win' | 'loss'; amount: number } | null>(null);
  
  const [botStakes, setBotStakes] = useState<Record<string, number>>({});
  const [botTakeProfits, setBotTakeProfits] = useState<Record<string, number>>({});
  const [botStopLosses, setBotStopLosses] = useState<Record<string, number>>({});
  const [showCreator, setShowCreator] = useState(false);
  // Blank form state — admin must explicitly fill every field, nothing pre-assumed
  const BLANK_BOT_DATA = {
    name: '',
    description: '',
    symbol: 'R_50',
    contractType: 'DIGITDIFF',
    amount: 1,
    duration: 1,
    martingale: false,
    martingaleMultiplier: 2,
    maxMartingaleSteps: 3,
    stopLoss: 10,
    takeProfit: 20,
  };
  const [newBotData, setNewBotData] = useState({ ...BLANK_BOT_DATA });

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
    const { data, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AutoTrendX] trading_bots fetch error:', JSON.stringify(error));
      // Show error to admin so they know the table/RLS is misconfigured
      if (isAdmin) {
        alert(
          `❌ Could not load bots from Supabase:\n\n` +
          `Code: ${error.code}\nMessage: ${error.message}\n\n` +
          `Make sure you have:\n` +
          `1. Run supabase-schema.sql in your Supabase SQL editor\n` +
          `2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel`
        );
      }
      return;
    }

    if (data) {
      console.log('[AutoTrendX] Loaded', data.length, 'bots from Supabase');
      setBots(data);
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

    const customStake = botStakes[bot.id];
    const customTP = botTakeProfits[bot.id];
    const customSL = botStopLosses[bot.id];
    const effectiveBot: Bot = {
      ...bot,
      strategy: {
        ...bot.strategy,
        amount: (customStake && customStake > 0) ? customStake : bot.strategy.amount,
        takeProfit: (customTP && customTP > 0) ? customTP : bot.strategy.takeProfit,
        stopLoss: (customSL && customSL > 0) ? customSL : bot.strategy.stopLoss,
      },
    };
    
    setRunningBotId(bot.id);
    runningBotIdRef.current = bot.id;
    isRunningRef.current = true;
    
    setLogs([]);
    setTradePopup(null);
    
    addLog(`Initializing ${effectiveBot.name}...`, 'info');
    
    // Execute trade loop in background
    runBotLoop(effectiveBot);
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
    // Preserve existing cumulative stats & Net P/L when starting bot
    let netProfit = statsRef.current.netProfit;
    let winsCount = statsRef.current.wins;
    let lossesCount = statsRef.current.losses;
    let totalTradesCount = statsRef.current.totalTrades;
    let totalProfitSum = statsRef.current.totalProfit;
    let totalLossSum = statsRef.current.totalLoss;

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
          totalProfitSum += finalProfit;
          consecutiveLosses = 0;
          currentStake = strategy.amount; // Reset to admin-configured base stake on win
          addLog(`👍 WIN! Profit: +$${finalProfit.toFixed(2)} | Net: $${netProfit.toFixed(2)}`, 'success');
          setTradePopup({ type: 'win', amount: finalProfit });
          setTimeout(() => setTradePopup(null), 2000);
        } else {
          lossesCount++;
          netProfit += finalProfit;
          totalLossSum += Math.abs(finalProfit);
          consecutiveLosses++;
          addLog(`👎 LOSS! Loss: $${finalProfit.toFixed(2)} | Net: $${netProfit.toFixed(2)}`, 'error');
          setTradePopup({ type: 'loss', amount: finalProfit });
          setTimeout(() => setTradePopup(null), 2000);

          // Martingale: all values come strictly from bot.strategy (admin-configured)
          // Use strict < so exactly maxMartingaleSteps multiplications occur (no off-by-one)
          if (strategy.martingale && consecutiveLosses < strategy.maxMartingaleSteps) {
            currentStake = currentStake * strategy.martingaleMultiplier;
            addLog(
              `🔁 Martingale Step ${consecutiveLosses}/${strategy.maxMartingaleSteps - 1}: ` +
              `Stake → $${currentStake.toFixed(2)} (×${strategy.martingaleMultiplier})`,
              'warning'
            );
          } else {
            if (strategy.martingale) {
              addLog(
                `⚠️ Martingale limit reached (${strategy.maxMartingaleSteps - 1} steps). ` +
                `Resetting stake to base $${strategy.amount.toFixed(2)}.`,
                'warning'
              );
            }
            consecutiveLosses = 0;
            currentStake = strategy.amount; // Back to admin-configured base stake
          }
        }

        // Update display stats
        updateStats({
          totalTrades: totalTradesCount,
          wins: winsCount,
          losses: lossesCount,
          netProfit: netProfit,
          totalProfit: totalProfitSum,
          totalLoss: totalLossSum,
        });

        // ⚡ Immediate real-time balance update on screen without refreshing
        if (onBalanceUpdate) {
          onBalanceUpdate(finalProfit);
        }

        // Fetch exact balance from Deriv API WebSocket to ensure 100% precision
        try {
          const balRes = await derivAPI.getBalance();
          if (balRes?.balance?.balance !== undefined) {
            if (onBalanceUpdate) {
              onBalanceUpdate(0, Number(balRes.balance.balance));
            }
          }
        } catch { /* ignore */ }

        // Insert trade log in database with fallback to localStorage
        let dbUserId = userId;
        let dbUserEmail = userEmail;
        try {
          const raw = localStorage.getItem('deriv_auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (!dbUserId) dbUserId = parsed.account || parsed.loginid || null;
            if (!dbUserEmail) dbUserEmail = parsed.email || null;
          }
        } catch {}

        if (dbUserId) {
          const tradeData = {
            user_id: dbUserId,
            user_email: dbUserEmail,
            bot_id: bot.id,
            symbol: strategy.symbol,
            contract_type: strategy.contractType,
            type: strategy.contractType === 'CALL' ? 'buy' : 'sell',
            amount: Number(currentStake) || 0,
            deriv_contract_id: String(contractId),
            profit_loss: Number(finalProfit) || 0,
            status: 'closed',
            entry_price: entryPrice != null && !isNaN(Number(entryPrice)) ? Number(entryPrice) : null
          };

          const { error: dbErr } = await supabase.from('trades').insert([tradeData]);
          if (dbErr) {
            console.error('[AutoTrendX] Failed to save trade to Supabase:', dbErr);
          } else {
            console.log('[AutoTrendX] Trade saved to Supabase:', tradeData);
          }
        } else {
          console.warn('[AutoTrendX] Skipped saving trade to Supabase: No active user account ID resolved.');
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

    // Use userEmail as user_id since this app uses Deriv OAuth (not Supabase auth)
    const effectiveUserId = userId ?? userEmail ?? 'admin';

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

    const { data, error } = await supabase
      .from('trading_bots')
      .insert([{
        user_id: effectiveUserId,
        name: botObj.name,
        description: botObj.description,
        strategy: botObj.strategy,
        is_public: true
      }])
      .select();

    if (error) {
      // Surface the real error to the admin — do NOT silently fall back to localStorage
      console.error('[AutoTrendX] Supabase bot insert failed:', error);
      alert(`❌ Failed to save bot to Supabase:\n\n${error.message}\n\nCheck your Supabase table permissions (RLS) and ensure the "trading_bots" table exists.`);
      return;
    }

    if (data && data.length > 0) {
      setBots([...bots, data[0]]);
      setShowCreator(false);
      alert('✅ Admin Bot created and saved to Supabase successfully!');
    }
  };

  const deleteBot = async (botId: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete bots.');
      return;
    }
    if (!confirm('Are you sure you want to delete this bot?')) return;
    try {
      await supabase.from('trading_bots').delete().eq('id', botId);
    } catch (err) {
      console.error('Error deleting from Supabase:', err);
    }
    setBots(prev => prev.filter((b) => b.id !== botId));
  };

  return (
    <div className="space-y-8">
      {/* Admin Panel Actions */}
      {isAdmin && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900/20 via-emerald-800/10 to-transparent border border-emerald-500/30 rounded-2xl p-6 shadow-lg shadow-emerald-950/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="font-extrabold text-gray-900 text-lg tracking-tight">Admin Strategy Deployer</h3>
              </div>
              <p className="text-gray-500 text-xs mt-1 max-w-xl leading-relaxed">
                As an Administrator, you can upload new bot files or create custom automated trading algorithms that deploy instantly to all client terminals.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="*"
                id="admin-xml-upload"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const isXml = file.name.toLowerCase().endsWith('.xml');
                  if (isXml) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const xmlContent = evt.target?.result as string;
                      const symbolMatch = xmlContent?.match(/<field name="SYMBOL_LIST">(.*?)<\/field>/);
                      const purchaseMatch = xmlContent?.match(/<field name="PURCHASE_LIST">(.*?)<\/field>/);
                      // Only use parsed values — never fall back to a hardcoded symbol/contract
                      const symbol = symbolMatch ? symbolMatch[1] : '';
                      const contractType = purchaseMatch ? purchaseMatch[1] : '';
                      const suggested = file.name.replace(/\.xml$/i, '').toUpperCase();
                      setUploadBotName(suggested);
                      setUploadBotDesc('');
                      setPendingUpload({ symbol, contractType, fileName: file.name });
                    };
                    reader.readAsText(file);
                  } else {
                    // Non-XML: no symbol/contract can be parsed — admin must select in modal
                    const suggested = file.name.replace(/\.[^.]+$/, '').toUpperCase();
                    setUploadBotName(suggested);
                    setUploadBotDesc('');
                    setPendingUpload({ symbol: '', contractType: '', fileName: file.name });
                  }
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="admin-xml-upload"
                className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-xs cursor-pointer active:scale-95"
              >
                <Upload size={14} className="text-gray-500" /> Upload File (.XML)
              </label>
              <button
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-xs"
              >
                <Plus size={14} /> Create Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade result popup — floats fixed at top-center of viewport */}
      <AnimatePresence>
        {tradePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: -40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-white text-xl pointer-events-none select-none ${
              tradePopup.type === 'win'
                ? 'bg-emerald-500 shadow-emerald-500/50'
                : 'bg-rose-500 shadow-rose-500/50'
            }`}
          >
            <span className="text-3xl">{tradePopup.type === 'win' ? '🎉' : '💸'}</span>
            {tradePopup.type === 'win'
              ? `WIN  +$${Math.abs(tradePopup.amount).toFixed(2)}`
              : `LOSS  -$${Math.abs(tradePopup.amount).toFixed(2)}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot Runner Live Console */}
      <AnimatePresence>
        {runningBotId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-2xl text-white space-y-6 relative overflow-hidden"
          >
            {/* Pulse glow grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
                  <Cpu size={22} className="text-emerald-400 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg tracking-tight">
                    {bots.find(b => b.id === runningBotId)?.name}
                  </h3>
                  <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 mt-0.5">
                    Live Session Active
                  </span>
                </div>
              </div>
              <button
                onClick={stopBot}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-red-500/10 hover:shadow-red-500/20 text-xs active:scale-95 self-start sm:self-auto"
              >
                <Pause size={14} /> Kill Execution
              </button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              {[
                { label: 'Total Trades', value: stats.totalTrades, icon: History, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
                { label: 'Wins', value: stats.wins, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/10' },
                { label: 'Losses', value: stats.losses, icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/5 border-rose-500/10' },
                { label: 'Total Profit', value: `+$${stats.totalProfit.toFixed(2)}`, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/10' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl border p-4 transition-all ${stat.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <p className={`text-2xl font-black font-mono tracking-tight ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Live Console Logs */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2 text-slate-500 text-xs px-1 font-bold font-mono">
                <span>TERMINAL STREAMS</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE</span>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 h-60 overflow-y-auto font-mono text-xs space-y-2.5 shadow-inner">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 leading-relaxed ${
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'error' ? 'text-rose-400' :
                      log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                    <span className="flex-1">{log.text}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-slate-500 text-center py-16 flex flex-col items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" />
                    <span>Booting system logs... awaiting first API handshake</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available bots card grid */}
      <div className="space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="font-extrabold text-gray-900 text-xl tracking-tight">Strategy Repository</h3>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Choose an automated strategy configuration below. Click "Start Auto Bot" to launch its micro-trading sequence within your session sandbox.
          </p>
        </div>

        {bots.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-3 shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              🤖
            </div>
            <h4 className="font-bold text-gray-800 text-base">No active bot templates</h4>
            <p className="text-xs text-gray-400">Deploy a bot from the Admin Console to show it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bots.map((bot) => {
              const isThisBotRunning = runningBotId === bot.id;
              return (
                <div
                  key={bot.id}
                  className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group ${
                    isThisBotRunning ? 'ring-2 ring-emerald-500 border-emerald-400' : 'border-gray-200'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-gray-800 text-base group-hover:text-emerald-600 transition-colors">{bot.name}</h4>
                        <span className="text-[9px] bg-emerald-50 border border-emerald-200/50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase mt-1.5 inline-block tracking-wider">
                          AutoTrendX Pro
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteBot(bot.id)}
                          className="text-gray-400 hover:text-rose-500 p-1.5 hover:bg-gray-50 rounded-xl transition-all active:scale-95"
                          title="Delete Bot"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <p className="text-gray-600 text-xs leading-relaxed font-medium">{bot.description}</p>

                    {/* Strategy overview parameters */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 grid grid-cols-3 gap-y-4 gap-x-2 text-center text-[10px] text-gray-500">
                      <div>
                        <span className="block text-gray-400 mb-0.5 font-bold uppercase tracking-wider">Asset Market</span>
                        <span className="font-extrabold text-gray-800 font-mono text-xs">
                          {Object.keys(SYNTHETIC_INDICES).find(
                            (k) => SYNTHETIC_INDICES[k as keyof typeof SYNTHETIC_INDICES] === bot.strategy.symbol
                          )?.replace(' Index', '') || bot.strategy.symbol}
                        </span>
                      </div>
                      <div>
                        <span className="block text-gray-400 mb-0.5 font-bold uppercase tracking-wider">Base Stake</span>
                        <span className="font-extrabold text-gray-800 text-xs">${bot.strategy.amount}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 mb-0.5 font-bold uppercase tracking-wider">Contract</span>
                        <span className="font-extrabold text-emerald-600 text-xs">{bot.strategy.contractType}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 mb-0.5 font-bold uppercase tracking-wider">Martingale</span>
                        <span className="font-extrabold text-gray-800 text-xs">{bot.strategy.martingale ? `${bot.strategy.martingaleMultiplier}x` : 'Off'}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 mb-0.5 font-bold uppercase tracking-wider">Stop Loss</span>
                        <span className="font-extrabold text-rose-500 text-xs">${bot.strategy.stopLoss}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 mb-0.5 font-bold uppercase tracking-wider">Take Profit</span>
                        <span className="font-extrabold text-emerald-500 text-xs">${bot.strategy.takeProfit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {/* Adjustable inputs — stake, take profit, stop loss */}
                    {!isThisBotRunning && (
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stake ($)</label>
                          <input
                            type="number"
                            min={0.35}
                            step={0.01}
                            value={botStakes[bot.id] ?? bot.strategy.amount}
                            onChange={(e) => setBotStakes(prev => ({ ...prev, [bot.id]: Number(e.target.value) }))}
                            className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Take Profit ($)</label>
                          <input
                            type="number"
                            min={1}
                            step={0.5}
                            value={botTakeProfits[bot.id] ?? bot.strategy.takeProfit}
                            onChange={(e) => setBotTakeProfits(prev => ({ ...prev, [bot.id]: Number(e.target.value) }))}
                            className="w-full border border-emerald-200 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">Stop Loss ($)</label>
                          <input
                            type="number"
                            min={1}
                            step={0.5}
                            value={botStopLosses[bot.id] ?? bot.strategy.stopLoss}
                            onChange={(e) => setBotStopLosses(prev => ({ ...prev, [bot.id]: Number(e.target.value) }))}
                            className="w-full border border-rose-200 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                          />
                        </div>
                      </div>
                    )}
                    {isThisBotRunning ? (
                      <button
                        onClick={stopBot}
                        className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/10 active:scale-95"
                      >
                        Terminate Execution
                      </button>
                    ) : (
                      <button
                        onClick={() => startBot(bot)}
                        disabled={!!runningBotId}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/15 active:scale-95"
                      >
                        Start Auto Bot
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                {/* Market symbol — shown always so admin can verify/override what was parsed from XML */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Market Symbol <span className="text-red-500">*</span></label>
                  <select
                    value={pendingUpload?.symbol ?? ''}
                    onChange={(e) => setPendingUpload(p => p ? { ...p, symbol: e.target.value } : p)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">— Select market —</option>
                    {Object.entries(SYNTHETIC_INDICES).map(([name, symbol]) => (
                      <option key={symbol} value={symbol}>{name}</option>
                    ))}
                  </select>
                </div>
                {/* Contract type — shown always */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contract Type <span className="text-red-500">*</span></label>
                  <select
                    value={pendingUpload?.contractType ?? ''}
                    onChange={(e) => setPendingUpload(p => p ? { ...p, contractType: e.target.value } : p)}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">— Select contract type —</option>
                    <option value="DIGITDIFF">Digit Differs (DIGITDIFF)</option>
                    <option value="DIGITMATCH">Digit Matches (DIGITMATCH)</option>
                    <option value="DIGITOVER">Digit Over (DIGITOVER)</option>
                    <option value="DIGITUNDER">Digit Under (DIGITUNDER)</option>
                    <option value="DIGITODD">Digit Odd (DIGITODD)</option>
                    <option value="DIGITEVEN">Digit Even (DIGITEVEN)</option>
                    <option value="CALL">Rise (CALL)</option>
                    <option value="PUT">Fall (PUT)</option>
                  </select>
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
                  disabled={!uploadBotName.trim() || !pendingUpload?.symbol || !pendingUpload?.contractType}
                  onClick={async () => {
                    const name = uploadBotName.trim();
                    const description = uploadBotDesc.trim() || `Admin uploaded bot on ${pendingUpload.symbol}.`;
                    const effectiveUserId = userId ?? userEmail ?? 'admin';
                    // Use the newBotData form values — never hardcode strategy
                    const strategy = {
                      symbol: pendingUpload.symbol,
                      contractType: pendingUpload.contractType,
                      amount: Number(newBotData.amount),
                      duration: Number(newBotData.duration),
                      martingale: newBotData.martingale,
                      martingaleMultiplier: Number(newBotData.martingaleMultiplier),
                      maxMartingaleSteps: Number(newBotData.maxMartingaleSteps),
                      stopLoss: Number(newBotData.stopLoss),
                      takeProfit: Number(newBotData.takeProfit),
                    };

                    const { data, error } = await supabase
                      .from('trading_bots')
                      .insert([{
                        name,
                        description,
                        strategy,
                        is_public: true,
                        user_id: effectiveUserId
                      }])
                      .select();

                    if (error) {
                      // Surface the real error — do NOT silently fall back to localStorage
                      console.error('[AutoTrendX] Supabase bot upload failed:', error);
                      alert(`❌ Failed to save bot to Supabase:\n\n${error.message}\n\nCheck your Supabase table permissions (RLS) and ensure the "trading_bots" table exists.`);
                      return;
                    }

                    if (data && data.length > 0) {
                      setBots(prev => [data[0], ...prev.filter(b => b.id !== data[0].id)]);
                      setPendingUpload(null);
                      setUploadBotName('');
                      setUploadBotDesc('');
                      setNewBotData({ ...BLANK_BOT_DATA }); // Reset to blank after deploy
                      alert(`✅ Bot "${name}" deployed to Supabase and visible to all users!`);
                    }
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
