import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Upload, Plus, Trash2, Users, Bot, Settings,
  LogOut, Database, CheckCircle2,
  AlertTriangle, RefreshCw, Eye, Sparkles, Zap,
  TrendingUp, TrendingDown, Server, Lock,
  BarChart2, Globe, Power, AlertCircle,
  Menu, X
} from 'lucide-react';
import { SYNTHETIC_INDICES } from '../lib/derivAPI';
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

interface BotItem {
  id: string;
  name: string;
  description: string;
  strategy: BotStrategy;
  is_public: boolean;
  user_id?: string;
  created_at?: string;
}

interface AdminPanelProps {
  adminEmail?: string;
  onLogout: () => void;
}

export default function AdminPanel({ adminEmail = 'admin@autotrendx.co.ke', onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bots' | 'clients' | 'settings'>('overview');
  const [bots, setBots] = useState<BotItem[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotItem | null>(null);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  const [newBot, setNewBot] = useState({
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

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('autotrendx_system_settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      appId: '67664',
      wsUrl: 'wss://ws.derivws.com/websockets/v3',
      maintenanceMode: false,
      autoDeployDefaults: true,
    };
  });

  const [clients, setClients] = useState<any[]>([]);
  const [isUsingLiveDb, setIsUsingLiveDb] = useState(false);
  const [liveTrades, setLiveTrades] = useState<any[]>([]);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);

  useEffect(() => {
    loadAdminBots();
    loadClientData();
    loadLiveTrades();

    const interval = setInterval(() => {
      loadClientData();
      loadLiveTrades();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadAdminBots = async () => {
    const list: BotItem[] = [
      {
        id: 'default-autotrendx-v50',
        name: 'AUTOTRENDX BOT (V50 Digits)',
        description: "D'Alembert strategy on Volatility 50 (Digits). Auto-adjusts stake on wins/losses.",
        is_public: true,
        strategy: { symbol: 'R_50', contractType: 'DIGITDIFF', amount: 1, duration: 1, martingale: true, martingaleMultiplier: 2, maxMartingaleSteps: 4, stopLoss: 20, takeProfit: 40 }
      }
    ];

    try {
      const raw = localStorage.getItem('autotrendx_admin_bots');
      if (raw) {
        const local = JSON.parse(raw);
        if (Array.isArray(local)) {
          list.push(...local.filter((item: any) => !list.some(b => b.id === item.id)));
        }
      }
    } catch {}

    try {
      const { data, error } = await supabase.from('trading_bots').select('*').eq('is_public', true);
      if (!error && data && data.length > 0) {
        list.push(...data.filter((d: any) => !list.some(b => b.id === d.id)));
      }
    } catch {}

    setBots(list);
  };

  const handleSaveLocalBot = (botItem: BotItem) => {
    try {
      const raw = localStorage.getItem('autotrendx_admin_bots');
      const existing: BotItem[] = raw ? JSON.parse(raw) : [];
      const updated = [botItem, ...existing.filter(b => b.id !== botItem.id)];
      localStorage.setItem('autotrendx_admin_bots', JSON.stringify(updated));
    } catch {}
  };

  const handleRemoveLocalBot = (botId: string) => {
    try {
      const raw = localStorage.getItem('autotrendx_admin_bots');
      const existing: BotItem[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem('autotrendx_admin_bots', JSON.stringify(existing.filter(b => b.id !== botId)));
    } catch {}
  };

  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const suggestedName = file.name.replace(/\.[^.]+$/, '').toUpperCase();
    const botName = prompt('Enter a name for your uploaded bot:', suggestedName);
    if (!botName || !botName.trim()) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const xmlContent = evt.target?.result as string;
      const symbolMatch = xmlContent ? xmlContent.match(/<field name="SYMBOL_LIST">(.*?)<\/field>/) : null;
      const purchaseMatch = xmlContent ? xmlContent.match(/<field name="PURCHASE_LIST">(.*?)<\/field>/) : null;
      const symbol = symbolMatch ? symbolMatch[1] : 'R_50';
      const contractType = purchaseMatch ? purchaseMatch[1] : 'DIGITDIFF';

      const strategy: BotStrategy = { symbol, contractType, amount: 1, duration: 1, martingale: true, martingaleMultiplier: 2, maxMartingaleSteps: 4, stopLoss: 20, takeProfit: 40 };
      const description = `Uploaded bot (${file.name}) on ${symbol}.`;

      const { data, error } = await supabase.from('trading_bots').insert([{
        name: botName.trim(),
        description,
        strategy,
        is_public: true,
        user_id: adminEmail
      }]).select();

      if (error) {
        console.error('[AdminPanel] XML upload error:', error);
        alert(`❌ Failed to save bot to Supabase:\n\nCode: ${error.code}\nMessage: ${error.message}\n\nMake sure you have run supabase-schema.sql in your Supabase SQL Editor.`);
        return;
      }

      if (data && data.length > 0) {
        setBots(prev => [data[0], ...prev.filter(b => b.id !== data[0].id)]);
        alert(`✅ Bot "${botName.trim()}" deployed to Supabase and synced across all devices!`);
      }
    };

    if (file.name.toLowerCase().endsWith('.xml')) {
      reader.readAsText(file);
    } else {
      reader.onload({ target: { result: '' } } as any);
    }
    e.target.value = '';
  };

  const handleCreateBot = async () => {
    if (!newBot.name.trim()) return;
    const strategy: BotStrategy = {
      symbol: newBot.symbol,
      contractType: newBot.contractType,
      amount: Number(newBot.amount),
      duration: Number(newBot.duration),
      martingale: newBot.martingale,
      martingaleMultiplier: Number(newBot.martingaleMultiplier),
      maxMartingaleSteps: Number(newBot.maxMartingaleSteps),
      stopLoss: Number(newBot.stopLoss),
      takeProfit: Number(newBot.takeProfit),
    };
    const description = newBot.description || 'Custom proprietary strategy deployed by Administrator.';

    const { data, error } = await supabase.from('trading_bots').insert([{
      name: newBot.name.trim(),
      description,
      strategy,
      is_public: true,
      user_id: adminEmail
    }]).select();

    if (error) {
      console.error('[AdminPanel] Create bot error:', error);
      alert(`❌ Failed to save bot to Supabase:\n\nCode: ${error.code}\nMessage: ${error.message}\n\nMake sure you have run supabase-schema.sql in your Supabase SQL Editor.`);
      return;
    }

    if (data && data.length > 0) {
      setBots(prev => [data[0], ...prev.filter(b => b.id !== data[0].id)]);
      setShowCreator(false);
      setNewBot({ name: '', description: '', symbol: 'R_50', contractType: 'DIGITDIFF', amount: 1, duration: 1, martingale: true, martingaleMultiplier: 2, maxMartingaleSteps: 4, stopLoss: 20, takeProfit: 40 });
      alert('✅ Bot deployed to Supabase and visible to all clients!');
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (botId.startsWith('default-')) { alert('Default system templates cannot be deleted.'); return; }
    if (!confirm('Are you sure you want to remove this bot template?')) return;
    try { await supabase.from('trading_bots').delete().eq('id', botId); } catch {}
    handleRemoveLocalBot(botId);
    setBots(prev => prev.filter(b => b.id !== botId));
  };

  const loadClientData = async () => {
    try {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
      if (pErr) throw pErr;

      // Always set total user count from profiles table
      if (profiles) {
        setTotalUsers(profiles.length);
      }

      if (profiles && profiles.length > 0) {
        const { data: balances } = await supabase.from('account_balance').select('*');
        const { data: trades } = await supabase.from('trades').select('user_id, profit_loss');

        // Set total trade count
        setTotalTrades(trades?.length ?? 0);

        const resolved = profiles.map((p: any) => {
          const balObj = balances?.find((b: any) => b.user_id === p.id);
          const userTrades = trades?.filter((t: any) => t.user_id === p.id) || [];
          return {
            id: p.id ? String(p.id).substring(0, 8).toUpperCase() : 'USER',
            name: p.full_name || p.email?.split('@')[0] || 'Trader',
            email: p.email || 'No email',
            accountType: p.account_type
              ? `${p.account_type.charAt(0).toUpperCase()}${p.account_type.slice(1)}`
              : (balObj?.currency ? `Real (${balObj.currency})` : 'Real (USD)'),
            activeBot: userTrades.length > 0 ? 'Auto Bot' : 'None',
            status: p.status || 'Online',
            balance: balObj?.balance !== undefined ? `$${Number(balObj.balance).toFixed(2)}` : '$0.00',
            totalTrades: userTrades.length
          };
        });
        setClients(resolved);
        setIsUsingLiveDb(true);
        return;
      }
    } catch {}

    // Fallback: also try to count trades even if profiles fail
    try {
      const { data: tradesAll } = await supabase.from('trades').select('id');
      setTotalTrades(tradesAll?.length ?? 0);
    } catch {}

    setClients([]);
    setIsUsingLiveDb(false);
  };

  const loadLiveTrades = async () => {
    try {
      const { data, error } = await supabase.from('trades').select('*').order('created_at', { ascending: false }).limit(10);
      if (!error && data && data.length > 0) {
        setLiveTrades(data.map((t: any) => ({
          id: t.id,
          email: t.user_email || 'client@deriv.com',
          symbol: t.symbol || 'R_50',
          type: t.type === 'buy' ? 'RISE' : (t.contract_type || 'TRADE'),
          amount: t.amount || t.stake || 0,
          profit: t.profit_loss !== undefined ? t.profit_loss : (t.profit || 0),
          time: t.created_at ? new Date(t.created_at).toLocaleTimeString() : new Date().toLocaleTimeString()
        })));
        return;
      }
    } catch {}
    setLiveTrades([]);
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('autotrendx_system_settings', JSON.stringify(settings));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      alert('Failed to save settings.');
    }
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={15} /> },
    { id: 'bots', label: 'Bot Deployment', icon: <Bot size={15} /> },
    { id: 'clients', label: 'Client Registry', icon: <Users size={15} /> },
    { id: 'settings', label: 'System Config', icon: <Settings size={15} /> },
  ] as const;

  return (
    <div className="min-h-screen text-gray-100 font-sans" style={{ background: 'linear-gradient(135deg, #060912 0%, #0b1120 50%, #060912 100%)' }}>
      {/* ── TOP ADMIN BAR ────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(6,9,18,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Shield size={18} className="text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm tracking-tight">AutoTrendX</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>Admin Console</span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">{adminEmail}</p>
            </div>
          </div>

          {/* Center tabs (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right controls & Hamburger Button */}
          <div className="flex items-center gap-2">
            {settings.maintenanceMode && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={10} className="animate-pulse" /> Maintenance ON
              </span>
            )}
            
            {/* Hamburger Button */}
            <button
              onClick={() => setHamburgerOpen(!hamburgerOpen)}
              className="flex items-center justify-center p-2 rounded-xl text-gray-300 hover:text-white transition-all border border-white/10 hover:border-emerald-500/40 hover:bg-white/5"
              title="Admin Menu"
            >
              {hamburgerOpen ? <X size={20} className="text-emerald-400" /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── HAMBURGER NAVIGATION SIDEBAR DRAWER (OPENS FROM LEFT) ────────────────── */}
      <AnimatePresence>
        {hamburgerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHamburgerOpen(false)}
            />
            {/* Left-sliding Drawer Content */}
            <motion.aside
              className="fixed top-0 left-0 bottom-0 z-[201] w-72 sm:w-80 shadow-2xl flex flex-col border-r border-white/10 overflow-y-auto"
              style={{ background: '#0a0f1d' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 bg-gray-950 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="font-black text-white text-sm tracking-tight block">AutoTrendX</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">Admin Console</span>
                  </div>
                </div>
                <button
                  onClick={() => setHamburgerOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body - Navigation Links */}
              <div className="p-5 space-y-6 flex-1">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 mb-3 px-1">Admin Navigation</p>
                  <div className="space-y-1.5">
                    {TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setHamburgerOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'}`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Quick Actions */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <a
                    href="/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <Eye size={15} /> Open Client View
                  </a>

                  <button
                    onClick={() => { setHamburgerOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:border-red-500/50"
                  >
                    <LogOut size={15} /> Logout Admin Session
                  </button>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-white/10 bg-gray-950/60 text-[10px] text-gray-500 text-center">
                Signed in as <span className="text-gray-300 font-mono">{adminEmail}</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ── STAT CARDS (always visible) ──────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Total Users */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.18)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Users</p>
              <p className="text-3xl font-black text-white">{totalUsers}</p>
              <p className="text-[10px] text-orange-400 mt-1">Registered on site</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-orange-400" style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)' }}>
              <Users size={22} />
            </div>
          </div>

          {/* Deployed Bots */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Deployed Bots</p>
              <p className="text-3xl font-black text-white">{bots.length}</p>
              <p className="text-[10px] text-emerald-400 mt-1">Available to all clients</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-400" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Bot size={22} />
            </div>
          </div>

          {/* Total Trades */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.18)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Trades</p>
              <p className="text-3xl font-black text-white">{totalTrades}</p>
              <p className="text-[10px] text-sky-400 mt-1">All-time trade executions</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sky-400" style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}>
              <TrendingUp size={22} />
            </div>
          </div>

          {/* API Status */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Deriv API</p>
              <p className="text-xl font-black text-emerald-400">Operational</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1">App ID: {settings.appId}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-violet-400" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Server size={22} />
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: settings.maintenanceMode ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.07)', border: `1px solid ${settings.maintenanceMode ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.18)'}` }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">System Mode</p>
              <p className={`text-xl font-black ${settings.maintenanceMode ? 'text-red-400' : 'text-emerald-400'}`}>
                {settings.maintenanceMode ? 'Maintenance' : 'Live'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                {settings.maintenanceMode ? 'Trading suspended for clients' : 'All systems operational'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${settings.maintenanceMode ? 'text-red-400' : 'text-emerald-400'}`}
              style={{ background: settings.maintenanceMode ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${settings.maintenanceMode ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
              <Power size={22} />
            </div>
          </div>
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Trades Feed */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                <div>
                  <h2 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live System Trade Feed
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">Real-time trade events across all client accounts</p>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest">Auto-streaming</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {liveTrades.length === 0 ? (
                  <div className="px-6 py-10 text-center text-gray-500 text-xs font-medium">
                    No live trade records found in the database.
                  </div>
                ) : (
                  liveTrades.slice(0, 8).map((t, i) => {
                    const isProfit = t.profit >= 0;
                    return (
                      <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="px-6 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-200">{t.symbol.replace('_', ' ')} · <span className="text-gray-400">{t.type}</span></p>
                            <p className="text-[10px] text-gray-500 font-mono">{t.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? `+$${Number(t.profit).toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`}
                          </p>
                          <p className="text-[10px] text-gray-600">{t.time}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Client Snapshot */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="font-bold text-white text-sm">Connected Clients</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">{isUsingLiveDb ? '🟢 Live database' : '⚡ No active database records'}</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {clients.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-500 text-xs font-medium">
                    No client accounts registered yet.
                  </div>
                ) : (
                  clients.map(c => (
                    <div key={c.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-200 truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{c.activeBot !== 'None' ? `Running: ${c.activeBot}` : 'No active bot'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-white font-mono">{c.balance}</p>
                        <span className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${c.status === 'Trading' ? 'bg-emerald-500/15 text-emerald-400' : c.status === 'Online' ? 'bg-sky-400/15 text-sky-400' : 'bg-gray-700 text-gray-400'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── BOT DEPLOYMENT TAB ───────────────────────────── */}
        {activeTab === 'bots' && (
          <div className="space-y-6">
            {/* Action Banner */}
            <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.08) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2"><Sparkles size={16} className="text-emerald-400" /> Bot Deployment Console</h2>
                <p className="text-xs text-gray-400 mt-1">Create or upload .XML strategy templates. Deployed bots appear instantly in all client dashboards.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input type="file" accept=".xml" id="admin-panel-xml-upload" className="hidden" onChange={handleXmlUpload} />
                <label htmlFor="admin-panel-xml-upload"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all text-emerald-300"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <Upload size={13} /> Upload .XML
                </label>
                <button onClick={() => setShowCreator(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <Plus size={13} /> Create Bot
                </button>
              </div>
            </div>

            {/* Bots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {bots.map((bot, i) => (
                <motion.div key={bot.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-5 flex flex-col justify-between group transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-block ${bot.id.startsWith('default-') ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25'}`}>
                          {bot.id.startsWith('default-') ? '⚙ System Default' : '★ Proprietary'}
                        </span>
                        <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors leading-tight">{bot.name}</h3>
                      </div>
                      {!bot.id.startsWith('default-') && (
                        <button onClick={() => handleDeleteBot(bot.id)}
                          className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed">{bot.description}</p>

                    <div className="grid grid-cols-3 gap-2 rounded-xl p-3 text-center text-[9px]" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div><span className="block text-gray-600 uppercase mb-0.5">Symbol</span><span className="font-bold text-gray-300 font-mono">{bot.strategy.symbol}</span></div>
                      <div><span className="block text-gray-600 uppercase mb-0.5">Stake</span><span className="font-bold text-emerald-400">${bot.strategy.amount}</span></div>
                      <div><span className="block text-gray-600 uppercase mb-0.5">Type</span><span className="font-bold text-sky-400">{bot.strategy.contractType}</span></div>
                      <div><span className="block text-gray-600 uppercase mb-0.5">Martingale</span><span className="font-bold text-white">{bot.strategy.martingale ? `${bot.strategy.martingaleMultiplier}×` : 'Off'}</span></div>
                      <div><span className="block text-gray-600 uppercase mb-0.5">SL</span><span className="font-bold text-red-400">${bot.strategy.stopLoss}</span></div>
                      <div><span className="block text-gray-600 uppercase mb-0.5">TP</span><span className="font-bold text-green-400">${bot.strategy.takeProfit}</span></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 size={11} /> Live for Clients
                    </span>
                    <button onClick={() => setSelectedBot(bot)} className="text-[10px] text-gray-400 hover:text-white font-semibold hover:underline transition-colors">
                      Inspect →
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── CLIENT REGISTRY TAB ──────────────────────────── */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Database size={16} className="text-sky-400" /> Client Account Registry
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isUsingLiveDb ? '🟢 Connected to live Supabase database' : '⚡ Direct Database Sync'} · Updates every 10 seconds
                </p>
              </div>
              <button onClick={() => { loadClientData(); loadLiveTrades(); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-gray-300"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {/* Full-width table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <table className="w-full text-left">
                <thead style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <tr>
                    {['Account ID', 'Trader', 'Account Type', 'Active Strategy', 'Status', 'Trades', 'Balance'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-gray-500 text-xs font-medium">
                        No client accounts found in the database.
                      </td>
                    </tr>
                  ) : (
                    clients.map((client, i) => (
                      <motion.tr key={client.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="border-t border-white/[0.04] hover:bg-white/[0.025] transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-emerald-400">{client.id}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-200">{client.name}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg ${client.accountType.includes('Real') ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>
                            {client.accountType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-300 font-medium">{client.activeBot}</td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-2 text-[10px] font-semibold text-gray-300">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${client.status === 'Trading' ? 'bg-emerald-400 animate-pulse' : client.status === 'Online' ? 'bg-sky-400' : 'bg-gray-600'}`} />
                            {client.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-gray-400">{client.totalTrades ?? 0}</td>
                        <td className="px-5 py-4 text-sm font-black text-white font-mono">{client.balance}</td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Live trades under the table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                    Live Trades Stream
                  </h3>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Streaming</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
                {liveTrades.length === 0 ? (
                  <div className="col-span-full px-6 py-8 text-center text-gray-500 text-xs font-medium">
                    No trade events recorded.
                  </div>
                ) : (
                  liveTrades.slice(0, 4).map(t => {
                    const isProfit = t.profit >= 0;
                    return (
                      <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="px-5 py-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-300 font-mono">{t.symbol}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.type === 'RISE' || t.type === 'MATCHES' ? 'text-sky-400 bg-sky-500/10' : 'text-violet-400 bg-violet-500/10'}`}>{t.type}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">Stake: ${Number(t.amount).toFixed(2)}</span>
                          <span className={`text-sm font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}{Number(t.profit).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-600 truncate">{t.email}</p>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SYSTEM CONFIG TAB ────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deriv API Config */}
            <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-violet-400" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <Globe size={18} />
                </div>
                <div>
                  <h2 className="font-black text-white text-sm">Deriv API Configuration</h2>
                  <p className="text-[10px] text-gray-500">Global connection credentials applied to all client sessions</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-2">Deriv Application ID</label>
                  <input
                    type="text"
                    value={settings.appId}
                    onChange={(e) => setSettings({ ...settings, appId: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none transition-all"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', caretColor: '#10b981' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-2">WebSocket Server URL</label>
                  <input
                    type="text"
                    value={settings.wsUrl}
                    onChange={(e) => setSettings({ ...settings, wsUrl: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none transition-all"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', caretColor: '#10b981' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>
            </div>

            {/* System Controls */}
            <div className="rounded-2xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-400" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className="font-black text-white text-sm">System Controls</h2>
                  <p className="text-[10px] text-gray-500">Global platform behavior and deployment flags</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Auto deploy toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all hover:bg-white/[0.02]"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => setSettings({ ...settings, autoDeployDefaults: !settings.autoDeployDefaults })}>
                  <div>
                    <p className="text-sm font-bold text-white">Auto-Deploy Default Bots</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Automatically provide V50, V75, and V100 strategies to all new clients</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${settings.autoDeployDefaults ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.autoDeployDefaults ? 'left-6' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Maintenance mode toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all"
                  style={{ background: settings.maintenanceMode ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.25)', border: `1px solid ${settings.maintenanceMode ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}` }}
                  onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}>
                  <div>
                    <p className={`text-sm font-bold ${settings.maintenanceMode ? 'text-red-400' : 'text-white'}`}>
                      <AlertTriangle size={13} className="inline mr-1.5" />
                      Maintenance Mode
                    </p>
                    <p className={`text-[10px] mt-0.5 ${settings.maintenanceMode ? 'text-red-300/70' : 'text-gray-500'}`}>
                      {settings.maintenanceMode ? '⚠️ Client trading is currently SUSPENDED' : 'Temporarily suspend all client bot execution'}
                    </p>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${settings.maintenanceMode ? 'left-6' : 'left-0.5'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="lg:col-span-2">
              <button onClick={handleSaveSettings}
                className="w-full py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-xl relative overflow-hidden"
                style={{ background: settingsSaved ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #10b981, #059669)' }}>
                <span className="flex items-center justify-center gap-2">
                  {settingsSaved ? <><CheckCircle2 size={16} /> Settings Saved & Applied Globally!</> : <><Lock size={15} /> Save & Apply Settings Globally</>}
                </span>
              </button>
              <p className="text-[10px] text-gray-600 text-center mt-2">Settings are written to localStorage and read by all client sessions in real time.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── BOT INSPECT MODAL ────────────────────────────────── */}
      {selectedBot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl"
            style={{ background: '#0d1626', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="font-black text-white text-base">{selectedBot.name}</h3>
                <p className="text-[10px] text-emerald-400 mt-0.5 uppercase tracking-wider font-bold">Strategy Configuration</p>
              </div>
              <button onClick={() => setSelectedBot(null)} className="text-gray-500 hover:text-white font-bold text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{selectedBot.description}</p>
            <div className="grid grid-cols-2 gap-3 rounded-xl p-4 text-xs" style={{ background: 'rgba(0,0,0,0.4)' }}>
              {[
                ['Market Symbol', selectedBot.strategy.symbol, 'font-mono text-white'],
                ['Contract Type', selectedBot.strategy.contractType, 'text-emerald-400'],
                ['Base Stake', `$${selectedBot.strategy.amount}`, 'text-white'],
                ['Duration', `${selectedBot.strategy.duration} tick(s)`, 'text-white'],
                ['Martingale', selectedBot.strategy.martingale ? `${selectedBot.strategy.martingaleMultiplier}× (Max ${selectedBot.strategy.maxMartingaleSteps} steps)` : 'Disabled', 'text-white'],
                ['SL / TP', `$${selectedBot.strategy.stopLoss} / $${selectedBot.strategy.takeProfit}`, 'text-white'],
              ].map(([label, val, cls]) => (
                <div key={label as string}>
                  <span className="text-gray-600 block text-[10px] uppercase tracking-wider mb-0.5">{label}</span>
                  <span className={`font-bold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedBot(null)}
              className="w-full py-3 rounded-xl font-bold text-sm text-gray-300 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* ── BOT CREATOR MODAL ────────────────────────────────── */}
      <AnimatePresence>
        {showCreator && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              className="rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 space-y-5"
              style={{ background: '#0d1626', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-black text-white text-base">Create & Deploy Proprietary Bot</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Publish custom strategy parameters to all client accounts</p>
                </div>
                <button onClick={() => setShowCreator(false)} className="text-gray-500 hover:text-white font-bold text-xl leading-none">✕</button>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Bot Name', key: 'name', type: 'text', placeholder: 'e.g. Martingale Scalper V75' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">{label}</label>
                    <input type={type} value={(newBot as any)[key]} onChange={e => setNewBot({ ...newBot, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">Description</label>
                  <textarea value={newBot.description} onChange={e => setNewBot({ ...newBot, description: e.target.value })}
                    placeholder="Short description explaining the strategy to clients..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none h-16 resize-none"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">Market Symbol</label>
                    <select value={newBot.symbol} onChange={e => setNewBot({ ...newBot, symbol: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {Object.entries(SYNTHETIC_INDICES).map(([name, symbol]) => (
                        <option key={symbol} value={symbol}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">Contract Type</label>
                    <select value={newBot.contractType} onChange={e => setNewBot({ ...newBot, contractType: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <option value="CALL">Rise (CALL)</option>
                      <option value="PUT">Fall (PUT)</option>
                      <option value="DIGITDIFF">Digit Differs</option>
                      <option value="DIGITMATCH">Digit Matches</option>
                    </select>
                  </div>
                  {[
                    { label: 'Base Stake ($)', key: 'amount', min: 0.35, step: '0.01' },
                    { label: 'Duration (Ticks)', key: 'duration', min: 1, max: 10 },
                    { label: 'Stop Loss ($)', key: 'stopLoss', min: 1 },
                    { label: 'Take Profit ($)', key: 'takeProfit', min: 1 },
                  ].map(({ label, key, min, max, step }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">{label}</label>
                      <input type="number" value={(newBot as any)[key]} min={min} max={max} step={step}
                        onChange={e => setNewBot({ ...newBot, [key]: Number(e.target.value) })}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/5 pt-3">
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => setNewBot({ ...newBot, martingale: !newBot.martingale })}>
                    <div className={`w-10 h-5 rounded-full transition-all relative ${newBot.martingale ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${newBot.martingale ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-200">Enable Martingale Stake Recovery</span>
                  </label>
                </div>

                {newBot.martingale && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Multiplier', key: 'martingaleMultiplier', min: 1.1, step: '0.1' },
                      { label: 'Max Steps', key: 'maxMartingaleSteps', min: 1, max: 10 },
                    ].map(({ label, key, min, max, step }) => (
                      <div key={key}>
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mb-1.5">{label}</label>
                        <input type="number" value={(newBot as any)[key]} min={min} max={max} step={step}
                          onChange={e => setNewBot({ ...newBot, [key]: Number(e.target.value) })}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 border-t border-white/5 pt-4">
                <button onClick={() => setShowCreator(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-400 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Cancel
                </button>
                <button onClick={handleCreateBot} disabled={!newBot.name}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  Publish & Deploy Bot
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
