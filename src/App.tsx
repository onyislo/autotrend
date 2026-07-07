import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Star, Play, UserPlus, ChevronRight, BarChart2, Zap, Shield, TrendingUp, Menu, X, ExternalLink } from 'lucide-react';
import { loginWithDeriv } from './lib/finalAuth';

function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="url(#atx-grad)" />
      <rect x="8" y="20" width="4" height="8" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="9.5" y="16" width="1" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="9.5" y="28" width="1" height="2" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="16" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="17.5" y="8" width="1" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="17.5" y="22" width="1" height="3" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="24" y="16" width="4" height="7" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="25.5" y="12" width="1" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
      <rect x="25.5" y="23" width="1" height="2" rx="0.5" fill="white" fillOpacity="0.6" />
      <polyline points="10,22 18,14 26,18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" strokeDasharray="2 1.5" />
      <defs>
        <linearGradient id="atx-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const NAV = ['Bots', 'Templates', 'Community', 'Pricing'];

const tickers = [
  { name: 'Volatility Index', val: '+1.82%', up: true },
  { name: 'Crash 500 Index', val: '-0.94%', up: false },
  { name: 'Step Index', val: '+0.45%', up: true },
  { name: 'Jump 75 Index', val: '+2.10%', up: true },
  { name: 'Boom 1000 Index', val: '-0.33%', up: false },
  { name: 'Volatility 100 Index', val: '+1.82%', up: true },
  { name: 'Crash 300 Index', val: '-0.94%', up: false },
  { name: 'Step Index', val: '+0.45%', up: true },
];

const reviews = [
  { initials: 'JO', name: 'James Oduya', role: 'Forex Day Trader - Kenya', text: 'I have tried 7 different bot platforms. This is the only one where the free bots actually make consistent profits.' },
  { initials: 'PN', name: 'Priya Naidoo', role: 'Crypto Scalper - South Africa', text: 'The automation workspace saved me 4 hours every day. My win rate jumped from 58% to 74% in two weeks.' },
  { initials: 'AH', name: 'Amina Hassan', role: 'Synthetic Indices Trader - Tanzania', text: 'The Smart AI recovery bot is absolutely insane. It pulled me out of a 30% drawdown in under 3 hours.' },
  { initials: 'RK', name: 'Raj Kumar', role: 'Indices Trader - India', text: 'Auto Trend X gave me the edge I was missing. The analytics and signals are spot-on every single session.' },
];

const features = [
  { icon: <Bot size={28} />, title: 'AI-Powered Bots', desc: 'Deploy proven bots in seconds with zero coding required.' },
  { icon: <BarChart2 size={28} />, title: 'Live Analytics', desc: 'Real-time dashboards tracking every trade and signal.' },
  { icon: <Shield size={28} />, title: 'Risk Management', desc: 'Built-in drawdown protection and smart recovery logic.' },
  { icon: <Zap size={28} />, title: 'Instant Signals', desc: 'Get trade alerts across indices, forex, and crypto markets.' },
];

/* ── Splash ── */
function Splash() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-gray-950 flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: 'backOut' }} className="flex flex-col items-center gap-5">
        <Logo size={72} />
        <div className="text-center">
          <motion.h1 className="text-3xl font-extrabold text-white tracking-tight" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
            Auto Trend X
          </motion.h1>
          <motion.p className="text-emerald-400 text-sm mt-1" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.4 }}>
            automated trading workspace
          </motion.p>
        </div>
        <motion.div className="w-48 h-1 rounded-full bg-gray-800 overflow-hidden mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ delay: 0.55, duration: 1.2, ease: 'easeInOut' }} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ── Auth Modal ── */
function AuthModal({ mode, onClose }: { mode: 'login' | 'register'; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleDerivLogin = () => {
    setLoading(true);
    loginWithDeriv(); // Real Deriv login with redirect
  };
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[90] flex items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
          initial={{ y: 32, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
          <div className="flex items-center gap-2 mb-6">
            <Logo size={32} />
            <span className="font-bold text-gray-900">Auto Trend X</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Start trading today'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login' 
              ? 'Sign in with your Deriv account to access your trading workspace.' 
              : 'Create a free Deriv account and start trading with professional tools. Anyone can join!'
            }
          </p>

          <button 
            onClick={handleDerivLogin}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Connecting to Deriv...
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                {mode === 'login' ? 'Login with Deriv' : 'Create Free Deriv Account'}
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-xs text-emerald-700">
              <strong>🌐 For Everyone:</strong> New users will be prompted to create a Deriv account during login. Existing users can login instantly with their Deriv credentials.
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>🔒 Secure & Regulated:</strong> Your account is protected by Deriv's advanced security and regulatory compliance.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            By continuing, you agree to Deriv's terms of service and privacy policy.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Mobile Drawer ── */
function Drawer({ open, onClose, onLogin, onRegister }: { open: boolean; onClose: () => void; onLogin: () => void; onRegister: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed top-0 left-0 z-[80] h-full w-72 bg-white shadow-2xl flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Logo size={32} />
                <span className="font-bold text-gray-900">Auto Trend X</span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <nav className="flex-1 px-5 py-6 flex flex-col gap-1">
              {NAV.map(n => (
                <a key={n} href="#" onClick={onClose} className="py-3 px-3 rounded-lg text-gray-700 font-medium hover:bg-emerald-50 hover:text-emerald-700 transition-colors">{n}</a>
              ))}
            </nav>
            <div className="px-5 pb-8 flex flex-col gap-3">
              <button onClick={() => { onClose(); onLogin(); }} className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:border-emerald-300 transition-colors">Log In</button>
              <button onClick={() => { onClose(); onRegister(); }} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors">Get Started</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── App ── */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState<'login' | 'register' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <AnimatePresence>{loading && <Splash />}</AnimatePresence>

      <Drawer open={drawer} onClose={() => setDrawer(false)} onLogin={() => setModal('login')} onRegister={() => setModal('register')} />

      <AnimatePresence>
        {modal && <AuthModal mode={modal} onClose={() => setModal(null)} />}
      </AnimatePresence>

      <motion.div
        className="min-h-screen bg-white text-gray-900 font-sans"
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Mobile: hamburger left */}
            <div className="flex items-center gap-3">
              <button className="md:hidden text-gray-600 hover:text-gray-900 p-1" onClick={() => setDrawer(true)}>
                <Menu size={22} />
              </button>
              <div className="flex items-center gap-2.5">
                <Logo size={34} />
                <div>
                  <span className="font-bold text-gray-900 text-base sm:text-lg leading-none block">Auto Trend X</span>
                  <span className="hidden sm:block text-xs text-gray-400 leading-none">automated trading workspace</span>
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              {NAV.map(n => <a key={n} href="#" className="hover:text-emerald-600 transition-colors">{n}</a>)}
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => setModal('login')} className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors">Log In</button>
              <button onClick={() => setModal('register')} className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg transition-colors">Get Started</button>
            </div>

            {/* Mobile auth shortcut */}
            <button className="md:hidden text-sm font-semibold bg-emerald-500 text-white px-4 py-1.5 rounded-lg" onClick={() => setModal('register')}>Join</button>
          </div>
        </nav>

        {/* Ticker */}
        <div className="fixed top-16 w-full z-40 bg-gray-50 border-b border-gray-100 overflow-hidden py-2">
          <div className="flex animate-marquee whitespace-nowrap gap-10">
            {[...tickers, ...tickers].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <TrendingUp size={12} className={t.up ? 'text-emerald-500' : 'text-red-400 rotate-180'} />
                <span>{t.name}</span>
                <span className={t.up ? 'text-emerald-600' : 'text-red-500'}>{t.val}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hero */}
        <section className="pt-36 sm:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 bg-gradient-to-b from-emerald-50 to-white text-center">
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 border border-emerald-200 bg-white text-emerald-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 sm:mb-8">
              <Zap size={12} /> FREE BOTS, AUTOMATION & TRADING TOOLS
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-5 sm:mb-6">
              Free bots <span className="text-emerald-500">ready to load</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
              Search proven templates, open tutorial guides, and move directly into the bot builder when you are ready to test.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button onClick={() => setModal('register')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-100">
                <Play size={16} /> Start Trading Now
              </button>
              <button onClick={() => setModal('register')} className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-200 hover:border-emerald-300 text-gray-700 font-semibold px-7 py-3.5 rounded-xl transition-colors bg-white">
                <UserPlus size={16} /> Create Free Account
              </button>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="py-10 sm:py-12 px-4 sm:px-6 border-y border-gray-100">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[['12,000+', 'Active Traders'], ['98%', 'Uptime Guaranteed'], ['500+', 'Bot Templates'], ['4.9/5', 'Average Rating']].map(([val, label]) => (
              <div key={label}>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500 mb-1">{val}</div>
                <div className="text-xs sm:text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
          <div className="max-w-5xl mx-auto text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Everything you need to trade smarter</h2>
            <p className="text-gray-500 text-sm sm:text-base">Professional-grade tools, completely free to get started.</p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
              Loved by <span className="text-emerald-500">12,000+</span> traders
            </h2>
            <p className="text-gray-500 text-sm sm:text-base">Real reviews from real traders across Africa and Asia</p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reviews.map((r, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{r.initials}</div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.role}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">{[...Array(5)].map((_, j) => <Star key={j} size={13} className="fill-emerald-400 text-emerald-400" />)}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-24 px-4 sm:px-6 bg-emerald-500 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Start automating your trades today</h2>
          <p className="text-emerald-100 mb-8 max-w-md mx-auto text-sm sm:text-base">Join thousands of traders using Auto Trend X bots to grow their accounts consistently.</p>
          <button onClick={() => setModal('register')} className="flex items-center gap-2 mx-auto bg-white text-emerald-600 font-bold px-8 py-4 rounded-xl hover:bg-emerald-50 transition-colors shadow-lg">
            Get Started Free <ChevronRight size={18} />
          </button>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-10 px-4 sm:px-6 text-center text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Logo size={28} />
            <span className="font-bold text-white">Auto Trend X</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-4">
            {['Bots', 'Templates', 'Community', 'Pricing', 'Support'].map(n => (
              <a key={n} href="#" className="hover:text-white transition-colors">{n}</a>
            ))}
          </div>
          <p>&copy; 2026 Auto Trend X. All rights reserved.</p>
        </footer>

        <style>{`
          @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
          .animate-marquee { animation: marquee 30s linear infinite; }
        `}</style>
      </motion.div>
    </>
  );
}
