import React, { useState, useEffect } from 'react';
import { ViewType } from '../types';
import { 
  LayoutDashboard, 
  FileText, 
  Tag, 
  Landmark, 
  PiggyBank, 
  Settings, 
  X,
  Lock,
  Sun,
  Moon,
  Download,
  CloudCheck,
  CloudUpload
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';

interface NavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'clean';
  onThemeToggle: () => void;
}

export function Navigation({ currentView, onViewChange, isOpen, onClose, theme, onThemeToggle }: NavigationProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (navigator as any).standalone === true;
    }
    return false;
  });
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;
    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      unsubscribe = onSnapshot(userDocRef, { includeMetadataChanges: true }, (snapshot) => {
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
      });
    }
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const showInstallBtn = deferredPrompt && !isInstalled;

  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'extrato' as ViewType, label: 'Extrato', icon: FileText },
    { id: 'categorias' as ViewType, label: 'Categorias', icon: Tag },
    { id: 'contas_cartoes' as ViewType, label: 'Contas e Cartões', icon: Landmark },
    { id: 'reservas_cofrinhos' as ViewType, label: 'Reserva e Cofrinhos', icon: PiggyBank },
    { id: 'configuracoes' as ViewType, label: 'Configurações', icon: Settings },
  ];

  const handleItemClick = (viewId: ViewType) => {
    onViewChange(viewId);
    onClose();
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-[280px] bg-[var(--bg-primary)] border-r border-[var(--bg-tertiary)] flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--bg-secondary)] flex items-center justify-center text-white font-extrabold text-xl tracking-tight">
                F
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-general)]">Fluc</h1>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-discreto)]">FINANCEIRO</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="md:hidden p-2 text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)] rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[var(--bg-app)] text-[var(--text-general)] font-bold border border-[var(--bg-tertiary)]' 
                      : 'text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)]/50'
                  }`}
                >
                  <div className={`p-1 rounded-[8px] ${isActive ? 'text-[var(--text-general)]' : 'text-[var(--text-discreto)]'}`}>
                    <IconComponent size={18} className="stroke-[2.5]" />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            {/* Theme Toggle in Menu */}
            <button
              onClick={onThemeToggle}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left text-sm font-semibold text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)]/50 transition-all cursor-pointer mt-4 border border-dashed border-[var(--bg-tertiary)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-1 rounded-[8px] text-[var(--text-discreto)]">
                  {theme === 'dark' ? <Sun size={18} className="stroke-[2.5]" /> : <Moon size={18} className="stroke-[2.5]" />}
                </div>
                <span>Tema: {theme === 'dark' ? 'Claro' : 'Escuro'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} />
              </div>
            </button>
          </nav>
        </div>

        {/* Workspace Brand Indicator - Human, humble, compliant */}
        <div className="p-6 border-t border-[var(--bg-tertiary)] bg-[var(--bg-app)]/50">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-full mb-4 flex items-center justify-center gap-2.5 px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/90 text-white font-bold text-sm rounded-2xl cursor-pointer transition-all border border-[var(--bg-tertiary)] hover:scale-[1.01] active:scale-[0.99] shadow-sm"
              id="pwa-install-button"
            >
              <Download size={16} className="stroke-[2.5]" />
              <span>Instalar Aplicativo</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-discreto)]">
            {hasPendingWrites ? (
              <>
                <CloudUpload size={14} className="text-amber-500 animate-pulse" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <CloudCheck size={14} className="text-emerald-500" />
                <span>Sincronizado</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-discreto)] mt-1 opacity-70">Versão 1.0.0 • Fluc PWA</p>
        </div>
      </div>
    </>
  );
}

