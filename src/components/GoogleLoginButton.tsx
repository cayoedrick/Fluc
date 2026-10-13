import React from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { LogIn, LogOut } from 'lucide-react';

export function GoogleLoginButton() {
  const [user, loading] = useAuthState(auth);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      if (window.showToast) {
        window.showToast('Login realizado com sucesso! Seus dados serão sincronizados.', 'sucesso');
      }
    } catch (error: any) {
      console.error('Login failed', error);
      if (window.showToast) {
        window.showToast(
          error?.code === 'auth/popup-closed-by-user' 
            ? 'Login cancelado.' 
            : 'Erro ao fazer login: ' + (error?.message || 'Falha na autenticação'),
          'erro'
        );
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (window.showToast) {
        window.showToast('Desconectado da conta Google.', 'info');
      }
    } catch (error: any) {
      console.error('Logout failed', error);
    }
  };

  if (loading) return <div className="p-3 text-xs text-[var(--text-discreto)]">Carregando autenticação...</div>;

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[18px]">
      {user ? (
        <>
          {user.photoURL ? (
            <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-[var(--bg-tertiary)]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-general)] truncate">{user.displayName || 'Usuário Conectado'}</p>
            <p className="text-xs text-[var(--text-discreto)] truncate">{user.email}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-general)] transition-colors cursor-pointer"
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut size={18} />
          </button>
        </>
      ) : (
        <button 
          onClick={handleLogin} 
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-[14px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-general)] transition-colors cursor-pointer"
        >
          <LogIn size={18} className="text-indigo-400" />
          <span className="text-sm font-semibold">Conectar conta Google</span>
        </button>
      )}
    </div>
  );
}
