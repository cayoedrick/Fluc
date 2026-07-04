import React, { useState } from 'react';
import { loginWithGoogle, logout } from '../services/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { LogIn, LogOut, User } from 'lucide-react';

export const Login = () => {
  const [user, loading, error] = useAuthState(auth);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading || isLoggingIn) return <div className="text-sm text-[var(--text-discreto)]">Autenticando...</div>;
  if (error) return <div className="text-sm text-red-500">Erro ao autenticar.</div>;

  if (user) {
    return (
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
            <User size={18} className="text-[var(--text-general)]" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-[var(--text-general)]">{user.displayName}</p>
            <p className="text-xs text-[var(--text-discreto)]">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-discreto)] hover:text-red-500"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleLogin} 
      className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 text-sm font-bold text-white rounded-xl bg-[var(--bg-secondary)] hover:opacity-90 transition-all shadow-md shadow-[var(--bg-secondary)]/10"
    >
      <LogIn size={18} />
      Conectar conta Google
    </button>
  );
};
