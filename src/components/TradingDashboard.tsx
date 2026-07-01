import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  History,
  LogOut,
  User,
  X,
  Save
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { derivAPI, SYNTHETIC_INDICES } from '../lib/derivAPI'
import { supabase } from '../lib/supabase'

interface Bot {
  id: string
  name: string
  strategy: any
  is_active: boolean
  created_at: string
}

interface Trade {
  id: string
  symbol: string
  type: string
  amount: number
  profit_loss: number
  status: string
  created_at: string
}

function BotCreator({ onClose, onSave }: { onClose: () => void, onSave: (bot: any) => void }) {
  const [botData, setBotData] = useState({
    name: '',
    symbol: 'R_75',
    contractType: 'CALL',
    amount: 1,
    duration: 5,
    martingale: false,
    martingaleMultiplier: 2,
    maxMartingaleSteps: 3,
    stopLoss: 10,
    takeProfit: 20
  })

  const handleSave = () => {
    const strategy = {
      symbol: botData.symbol,
      contractType: botData.contractType,
      amount: botData.amount,
      duration: botData.duration,
      martingale: botData.martingale,
      martingaleMultiplier: botData.martingaleMultiplier,
      maxMartingaleSteps: botData.maxMartingaleSteps,
      stopLoss: botData.stopLoss,
      takeProfit: botData.takeProfit
    }
    
    onSave({
      name: botData.name,
      strategy: strategy
    })
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Bot</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name</label>
            <input
              type="text"
              value={botData.name}
              onChange={(e) => setBotData({...botData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="My Trading Bot"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Market</label>
              <select
                value={botData.symbol}
                onChange={(e) => setBotData({...botData, symbol: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(SYNTHETIC_INDICES).map(([name, symbol]) => (
                  <option key={symbol} value={symbol}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contract Type</label>
              <select
                value={botData.contractType}
                onChange={(e) => setBotData({...botData, contractType: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CALL">Rise</option>
                <option value="PUT">Fall</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stake Amount ($)</label>
              <input
                type="number"
                value={botData.amount}
                onChange={(e) => setBotData({...botData, amount: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                min="1"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Ticks)</label>
              <input
                type="number"
                value={botData.duration}
                onChange={(e) => setBotData({...botData, duration: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="martingale"
                checked={botData.martingale}
                onChange={(e) => setBotData({...botData, martingale: e.target.checked})}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="martingale" className="ml-2 text-sm font-medium text-gray-700">
                Enable Martingale Strategy
              </label>
            </div>

            {botData.martingale && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Multiplier</label>
                  <input
                    type="number"
                    value={botData.martingaleMultiplier}
                    onChange={(e) => setBotData({...botData, martingaleMultiplier: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    min="1.1"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Steps</label>
                  <input
                    type="number"
                    value={botData.maxMartingaleSteps}
                    onChange={(e) => setBotData({...botData, maxMartingaleSteps: Number(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss ($)</label>
              <input
                type="number"
                value={botData.stopLoss}
                onChange={(e) => setBotData({...botData, stopLoss: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Take Profit ($)</label>
              <input
                type="number"
                value={botData.takeProfit}
                onChange={(e) => setBotData({...botData, takeProfit: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                min="1"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!botData.name}
            className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Create Bot
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TradingDashboard() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('bots')
  const [bots, setBots] = useState<Bot[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [balance, setBalance] = useState(0)
  const [showBotCreator, setShowBotCreator] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadUserData()
      connectToDerivAPI()
    }
  }, [user])

  const loadUserData = async () => {
    try {
      // Load bots
      const { data: botsData } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (botsData) setBots(botsData)

      // Load trades
      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (tradesData) setTrades(tradesData)

      // Load balance
      const { data: balanceData } = await supabase
        .from('account_balance')
        .select('balance')
        .eq('user_id', user?.id)
        .single()

      if (balanceData) setBalance(balanceData.balance)

    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectToDerivAPI = async () => {
    try {
      await derivAPI.connect()
      // Get balance from Deriv if user has token
      // This would be implemented based on stored Deriv token
    } catch (error) {
      console.error('Error connecting to Deriv API:', error)
    }
  }

  const createBot = async (botData: any) => {
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .insert([{
          user_id: user?.id,
          name: botData.name,
          strategy: botData.strategy,
          is_active: false
        }])
        .select()

      if (error) throw error
      if (data) {
        setBots([...bots, data[0]])
        setShowBotCreator(false)
      }
    } catch (error) {
      console.error('Error creating bot:', error)
    }
  }

  const toggleBot = async (botId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('trading_bots')
        .update({ is_active: !isActive })
        .eq('id', botId)

      if (!error) {
        setBots(bots.map(bot => 
          bot.id === botId ? { ...bot, is_active: !isActive } : bot
        ))
      }
    } catch (error) {
      console.error('Error toggling bot:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your trading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Auto Trend X</h1>
            <span className="text-sm text-gray-500">Trading Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign size={16} className="text-emerald-500" />
              <span className="font-semibold">${balance.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} />
              <span>{user?.email}</span>
            </div>
            
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-6 mb-8">
          {[
            { id: 'bots', label: 'My Bots', icon: Bot },
            { id: 'trades', label: 'Trade History', icon: History },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bots Tab */}
        {activeTab === 'bots' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Trading Bots</h2>
              <button
                onClick={() => setShowBotCreator(true)}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus size={16} />
                Create Bot
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map(bot => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bot.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {bot.is_active ? 'Active' : 'Stopped'}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>Market: {Object.keys(SYNTHETIC_INDICES).find(key => 
                      SYNTHETIC_INDICES[key as keyof typeof SYNTHETIC_INDICES] === bot.strategy.symbol
                    )}</div>
                    <div>Stake: ${bot.strategy.amount}</div>
                    <div>Type: {bot.strategy.contractType}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleBot(bot.id, bot.is_active)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        bot.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {bot.is_active ? <Pause size={14} /> : <Play size={14} />}
                      {bot.is_active ? 'Stop' : 'Start'}
                    </button>
                    
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                      <Settings size={14} />
                      Edit
                    </button>
                  </div>
                </motion.div>
              ))}

              {bots.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Bot size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No bots created yet</p>
                  <button
                    onClick={() => setShowBotCreator(true)}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Create Your First Bot
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'trades' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Trade History</h2>
            
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Symbol</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Type</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">P/L</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trades.map(trade => (
                      <tr key={trade.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{trade.symbol}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{trade.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">${trade.amount}</td>
                        <td className={`px-6 py-4 text-sm font-medium ${
                          trade.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            trade.status === 'closed' 
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(trade.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {trades.length === 0 && (
                <div className="text-center py-12">
                  <History size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No trades yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp size={20} className="text-emerald-500" />
                  <span className="text-sm font-medium text-gray-500">Total Profit</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${trades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0).toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 size={20} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-500">Total Trades</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{trades.length}</div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Bot size={20} className="text-purple-500" />
                  <span className="text-sm font-medium text-gray-500">Active Bots</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {bots.filter(bot => bot.is_active).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bot Creator Modal */}
      <AnimatePresence>
        {showBotCreator && (
          <BotCreator
            onClose={() => setShowBotCreator(false)}
            onSave={createBot}
          />
        )}
      </AnimatePresence>
    </div>
  )
}