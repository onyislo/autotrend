import { useState } from 'react';
import AdminLoginPage, { isAdminLoggedIn, clearAdminSession, getAdminSession } from './AdminLoginPage';
import AdminPanel from './AdminPanel';

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
    <AdminPanel
      adminEmail={session?.email}
      onLogout={handleLogout}
    />
  );
}
