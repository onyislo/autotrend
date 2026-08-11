import { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, LogIn } from 'lucide-react';

const ADMIN_EMAIL = 'admin@autotrendx.co.ke';
const ADMIN_PASSWORD = '127811';
const ADMIN_SESSION_KEY = 'autotrendx_admin_session';

export function setAdminSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    email: ADMIN_EMAIL,
    loggedIn: true,
    timestamp: Date.now()
  }));
}

export function getAdminSession(): { email: string; loggedIn: boolean } | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminLoggedIn(): boolean {
  const session = getAdminSession();
  return !!session?.loggedIn;
}

interface AdminLoginPageProps {
  onSuccess: () => void;
}

export default function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        setAdminSession();
        onSuccess();
      } else {
        setError('Invalid credentials. Access denied.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-900/20 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
          <p className="text-gray-500 text-sm">AutoTrendX Control Panel</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@autotrendx.co.ke"
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 outline-none transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
                <Lock size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Access Admin Panel
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-700 text-xs">
            🔒 This is a restricted admin area
          </p>
        </div>
      </div>
    </div>
  );
}
