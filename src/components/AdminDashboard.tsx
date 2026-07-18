import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, LogOut, Bot, BarChart3, Users, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { derivAPI, SYNTHETIC_INDICES } from '../lib/derivAPI';

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
  created_at: string;
}

interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  contract_type: string;
  amount: number;
  profit_loss: number;
  status: string;
  created_at: string;
}

function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#atx-grad-adm)" />
      <rect x="8" y="20" width="4" height="8" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="16" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="24" y="16" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
      <defs>
        <linearGradient id="atx-grad-adm" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" /><stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const EMPTY_BOT = {
  name: '', description: '', symbol: 'R_75', contractType: 'CALL',
  amount: 1, duration: 5, martingale: true, martingaleMultiplier: 2,
  maxMartingaleSteps: 4, stopLoss: 20, takeProfit: 40,
};

export default function AdminDashboard() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'bots' | 'trades'>('bots');
  const [showCreator, setShowCreator] = useState(false);
  const [newBot, setNewBot] = useState({ ...EMPTY_BOT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [botsRes, tradesRes] = await Promise.all([
        supabase.from('trading_bots').select('*').order('created_at', { ascending: false }),
        supabase.from('trades').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      if (botsRes.data) setBots(botsRes.data);
      if (tradesRes.data) setTrades(tradesRes.data);
    } finally {
      setLoading(false);
    }
  };

  const saveBot = async () => {
    if (!newBot.name) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .insert([{
          name: newBot.name,
          description: newBot.description,
          is_public: true,
          strategy: {
            symbol: newBot.symbol,
            contractType: newBot.contractType,
            amount: Number(newBot.amount),
            duration: Number(newBot.duration),
            martingale: newBot.martingale,
            martingaleMultiplier: Number(newBot.martingaleMultiplier),
            maxMartingaleSteps: Number(newBot.maxMartingaleSteps),
            stopLoss: Number(newBot.stopLoss),
            takeProfit: Number(newBot.takeProfit),
          }
        }])
        .select();

      if (!error && data) {
        setBots([data[0], ...bots]);
        setShowCreator(false);
        setNewBot({ ...EMPTY_BOT });
        alert('✅ Bot published! All users will see it now.');
      } else {
        alert('Error saving bot: ' + error?.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteBot = async (id: string) => {
    if (!confirm('Delete this bot? Users will no longer see it.')) return;
    const { error } = await supabase.from('trading_bots').delete().eq('id', id);
    if (!error) setBots(bots.filter(b => b.id !== id));
  };

  const logout = () => {
    sessionStorage.removeItem('atx_admin_session');
    supabase.auth.signOut();
    window.location.href = '/';
  };

  const totalProfit = trades.reduce((s, t) => s + (t.profit_loss || 0), 0);
  const uniqueUsers = new Set(trades.map(t => t.user_id)).size;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <span className="font-bold text-white">Auto Trend X</span>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck size={10} className="text-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">Admin Panel</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Bots', value: bots.length, icon: Bot, color: 'text-emerald-400' },
            { label: 'Total Trades', value: trades.length, icon: BarChart3, color: 'text-blue-400' },
            { label: 'Unique Users', value: uniqueUsers, icon: Users, color: 'text-purple-400' },
            {
              label: 'Platform P/L',
              value: `$${totalProfit.toFixed(2)}`,
              icon: BarChart3,
              color: totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 pb-0">
          {(['bots', 'trades'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-gray-900 border border-b-0 border-gray-800 text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'bots' ? `Bots (${bots.length})` : `Trade Logs (${trades.length})`}
            </button>
          ))}
        </div>

        {/* Bots Tab */}
        {activeTab === 'bots' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400">Bots marked as public are visible to all users on the platform.</p>
              <button
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-sm"
              >
                <Plus size={15} /> New Bot
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading bots...</div>
            ) : bots.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bot size={40} className="mx-auto mb-3 text-gray-700" />
                No bots yet. Create your first one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bots.map(bot => (
                  <div key={bot.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white">{bot.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${
                          bot.is_public ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                        }`}>
                          {bot.is_public ? '🟢 Public' : '🔒 Private'}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteBot(bot.id)}
                        className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{bot.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-gray-800 rounded-xl p-3">
                      <div><span className="block text-gray-500 mb-0.5">Market</span><span className="font-bold text-gray-300">{bot.strategy.symbol}</span></div>
                      <div><span className="block text-gray-500 mb-0.5">Stake</span><span className="font-bold text-white">${bot.strategy.amount}</span></div>
                      <div><span className="block text-gray-500 mb-0.5">Type</span><span className="font-bold text-emerald-400">{bot.strategy.contractType}</span></div>
                      <div><span className="block text-gray-500 mb-0.5">Martingale</span><span className="font-bold text-white">{bot.strategy.martingale ? `${bot.strategy.martingaleMultiplier}x` : 'Off'}</span></div>
                      <div><span className="block text-gray-500 mb-0.5">Stop Loss</span><span className="font-bold text-red-400">${bot.strategy.stopLoss}</span></div>
                      <div><span className="block text-gray-500 mb-0.5">Take Profit</span><span className="font-bold text-green-400">${bot.strategy.takeProfit}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading trades...</div>
            ) : trades.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No trades logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">User</th>
                      <th className="px-5 py-3 text-left">Symbol</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">Amount</th>
                      <th className="px-5 py-3 text-left">P/L</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {trades.map(trade => (
                      <tr key={trade.id} className="hover:bg-gray-800/50">
                        <td className="px-5 py-3 text-gray-400 font-mono text-xs">{trade.user_id?.slice(0, 12)}...</td>
                        <td className="px-5 py-3 font-semibold text-white">{trade.symbol}</td>
                        <td className="px-5 py-3 text-gray-300">{trade.contract_type}</td>
                        <td className="px-5 py-3 text-gray-300">${trade.amount}</td>
                        <td className={`px-5 py-3 font-bold ${trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss?.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{new Date(trade.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Bot Modal */}
      <AnimatePresence>
        {showCreator && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h3 className="font-bold text-white text-lg">Create & Publish Bot</h3>
                <button onClick={() => setShowCreator(false)} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Bot Name</label>
                  <input type="text" value={newBot.name} onChange={e => setNewBot({...newBot, name: e.target.value})}
                    placeholder="e.g. Trend Rider V75" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Description</label>
                  <textarea value={newBot.description} onChange={e => setNewBot({...newBot, description: e.target.value})}
                    placeholder="Explain the strategy to users..." rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Market</label>
                  <select value={newBot.symbol} onChange={e => setNewBot({...newBot, symbol: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                    {Object.entries(SYNTHETIC_INDICES).map(([name, sym]) => (
                      <option key={sym} value={sym}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Contract Type</label>
                  <select value={newBot.contractType} onChange={e => setNewBot({...newBot, contractType: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value="CALL">Rise (CALL)</option>
                    <option value="PUT">Fall (PUT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Base Stake ($)</label>
                  <input type="number" value={newBot.amount} min={0.35} step={0.01} onChange={e => setNewBot({...newBot, amount: Number(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Duration (Ticks)</label>
                  <input type="number" value={newBot.duration} min={1} max={10} onChange={e => setNewBot({...newBot, duration: Number(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Stop Loss ($)</label>
                  <input type="number" value={newBot.stopLoss} min={1} onChange={e => setNewBot({...newBot, stopLoss: Number(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Take Profit ($)</label>
                  <input type="number" value={newBot.takeProfit} min={1} onChange={e => setNewBot({...newBot, takeProfit: Number(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="col-span-2 border-t border-gray-800 pt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={newBot.martingale} onChange={e => setNewBot({...newBot, martingale: e.target.checked})}
                      className="rounded border-gray-600 text-emerald-500" />
                    Enable Martingale Recovery
                  </label>
                </div>
                {newBot.martingale && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Multiplier</label>
                      <input type="number" value={newBot.martingaleMultiplier} min={1.1} step={0.1} onChange={e => setNewBot({...newBot, martingaleMultiplier: Number(e.target.value)})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Max Steps</label>
                      <input type="number" value={newBot.maxMartingaleSteps} min={1} max={10} onChange={e => setNewBot({...newBot, maxMartingaleSteps: Number(e.target.value)})}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 border-t border-gray-800 pt-4">
                <button onClick={() => setShowCreator(false)} className="flex-1 py-3 border border-gray-700 rounded-xl text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                  Cancel
                </button>
                <button onClick={saveBot} disabled={!newBot.name || saving}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors">
                  {saving ? 'Publishing...' : 'Publish Bot'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
