import { useState } from 'react';
import AdminLoginPage, { isAdminLoggedIn, clearAdminSession, getAdminSession } from './AdminLoginPage';
import Dashboard from './Dashboard';
import { Shield, LogOut } from 'lucide-react';

export default function AdminRoute() {
  const [authed, setAuthed] = useState(() => isAdminLoggedIn());

  const handleLogout = () => {
    clearAdminSession();
    window.location.href = '/';
  };

  if (!authed) {
    return <AdminLoginPage onSuccess={() => setAuthed(true)} />;
  }

  const session = getAdminSession();

  return (
    <div className="relative">
      {/* Admin mode banner */}
      <div className="sticky top-0 z-[100] bg-emerald-600 text-white flex items-center justify-between px-4 py-2 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <Shield size={14} />
          <span>ADMIN MODE — {session?.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
        >
          <LogOut size={12} /> Exit Admin
        </button>
      </div>
      <Dashboard adminEmail={session?.email} />
    </div>
  );
}
