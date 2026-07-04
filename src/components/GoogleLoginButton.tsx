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
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="p-3 text-xs text-[var(--text-discreto)]">Carregando...</div>;

  return (
    <div className="flex items-center gap-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[18px]">
      {user ? (
        <>
          <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-general)]">{user.displayName}</p>
            <p className="text-xs text-[var(--text-discreto)]">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-general)]">
            <LogOut size={18} />
          </button>
        </>
      ) : (
        <button onClick={handleLogin} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-[12px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-general)]">
          <LogIn size={18} />
          <span className="text-sm font-semibold">Login com Google</span>
        </button>
      )}
    </div>
  );
}
