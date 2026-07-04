import React, { useRef } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, Sparkles, HelpCircle, Sun, Moon, Palette, ShieldCheck } from 'lucide-react';
import { FlucState } from '../types';
import { GoogleLoginButton } from './GoogleLoginButton';

interface ConfiguracoesViewProps {
  state: FlucState;
  onClearLancamentos: () => void;
  onResetAllData: () => void;
  onEraseAllData: () => void;
  onImportState: (jsonStr: string) => boolean;
  onOpenMenu?: () => void;
  onStartTutorial?: () => void;
  theme?: string;
  onThemeToggle?: () => void;
}

export function ConfiguracoesView({
  state,
  onClearLancamentos,
  onResetAllData,
  onEraseAllData,
  onImportState,
  onOpenMenu,
  onStartTutorial,
  theme = 'light',
  onThemeToggle
}: ConfiguracoesViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state to local JSON file
  const handleExportJSON = async () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      
      // Use File System Access API if available (Chrome, Edge, etc.)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `fluc_backup_${new Date().toISOString().split('T')[0]}.json`,
            types: [{
              description: 'JSON Backup File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          return;
        } catch (err: any) {
          // If user cancels, we just stop. Otherwise, fall back.
          if (err.name === 'AbortError') return;
          console.warn('showSaveFilePicker failed, falling back to legacy method.', err);
        }
      }

      // Fallback: Legacy anchor download method
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fluc_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Falha ao exportar backup de dados.');
    }
  };

  // Import state from uploaded JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportState(content);
        if (success) {
          alert('Dados importados e restaurados com sucesso!');
        } else {
          alert('Arquivo inválido. Por favor, faça upload de um backup JSON válido do Fluc.');
        }
      }
    };
    reader.readAsText(file);
    // Reset file input value
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearLancamentos = () => {
    const confirmClear = window.confirm('Tem certeza de que deseja APAGAR TODOS os lançamentos? Isso manterá as contas, cartões e categorias cadastradas.');
    if (confirmClear) {
      onClearLancamentos();
      alert('Todos os lançamentos foram excluídos!');
    }
  };

  const handleResetAllData = () => {
    const confirmReset = window.confirm('ATENÇÃO: Isso limpará TODOS os dados personalizados e restaurará o aplicativo com os valores padrões de fábrica. Deseja continuar?');
    if (confirmReset) {
      onResetAllData();
      alert('O aplicativo foi restaurado aos valores padrão!');
    }
  };

  const handleEraseAllData = () => {
    const confirmErase = window.confirm('ATENÇÃO EXTREMA: Isso apagará TODOS os seus lançamentos, contas, cartões, cofrinhos e também todas as categorias personalizadas criadas por você (mantendo apenas as padrão do sistema). Seu aplicativo ficará completamente zerado. Esta ação é irreversível. Deseja continuar?');
    if (confirmErase) {
      onEraseAllData();
      alert('Todos os dados foram apagados e o aplicativo foi zerado com sucesso!');
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Configurações</h2>
          </div>
        </div>
      </div>

      {/* 2. Apresentação & Tutorial Submenu */}
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Ajuda & Aprendizado</h3>
            <p className="text-xs text-[var(--text-discreto)]">Conheça o funcionamento do Fluc com nosso tutorial interativo</p>
          </div>
        </div>

        <div className="pt-1">
          <div 
            onClick={onStartTutorial}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-5 rounded-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--bg-secondary)] border border-[var(--bg-tertiary)] shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-general)]">Iniciar Tutorial de Apresentação</h4>
                <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">Assista à experiência guiada para aprender a usar receitas, despesas, buscas integradas e salvamento automático local.</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onStartTutorial) onStartTutorial();
              }}
              className="py-2.5 px-4 bg-[var(--bg-secondary)] hover:opacity-90 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer shrink-0"
            >
              Iniciar Tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Conta & Sincronização Submenu */}
      <div id="config-conta-sincronizacao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-indigo-500/15 text-indigo-500">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Conta</h3>
            <p className="text-xs text-[var(--text-discreto)]">Gerencie seu login</p>
          </div>
        </div>
        <GoogleLoginButton />
      </div>

      {/* 2. Local JSON Backup and Restore Submenu */}
      <div id="config-backup-restauracao" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-amber-500/15 text-amber-500">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Backup e Restauração</h3>
            <p className="text-xs text-[var(--text-discreto)]">Salve e recupere seus dados localmente via arquivos JSON</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Export JSON Card */}
          <div 
            onClick={handleExportJSON}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-4 rounded-[18px] flex items-center gap-3.5 cursor-pointer transition-all"
          >
            <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--text-general)] border border-[var(--bg-tertiary)]">
              <Download size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Fazer Backup de Dados</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">Exporta um arquivo .json com todos os seus dados personalizados.</p>
            </div>
          </div>

          {/* Import JSON Card */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-4 rounded-[18px] flex items-center gap-3.5 cursor-pointer transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
            <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--text-general)] border border-[var(--bg-tertiary)]">
              <Upload size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Restaurar de um Backup</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">Importa um arquivo de backup do Fluc para restaurar suas informações.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aparência e Temas Submenu */}
      <div id="config-themes-section" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[var(--bg-secondary)]/15 text-[var(--bg-secondary)]">
            <Palette size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Aparência e Temas</h3>
            <p className="text-xs text-[var(--text-discreto)]">Selecione o estilo visual que preferir para o Fluc</p>
          </div>
        </div>

        <div className="pt-1">
          <div 
            onClick={onThemeToggle}
            className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] p-5 rounded-[18px] flex items-center justify-between gap-4 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[var(--bg-primary)] rounded-[12px] text-[var(--text-general)] border border-[var(--bg-tertiary)] shrink-0">
                {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-500" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--text-general)]">Alternar Tema do Sistema</h4>
                <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                  Atualmente no Modo <strong>{theme === 'dark' ? 'Escuro (Dark)' : 'Claro (Light)'}</strong>. Clique aqui para mudar instantaneamente.
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onThemeToggle) onThemeToggle();
              }}
              className="py-2 px-3.5 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-semibold rounded-[12px] transition-all cursor-pointer shrink-0"
            >
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Delete Data Submenu */}
      <div id="config-apagar-dados" className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-6 rounded-[24px] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-[12px] bg-[#d03c4d]/15 text-[#d03c4d]">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-general)]">Apagar Dados</h3>
            <p className="text-xs text-[var(--text-discreto)]">Gerencie a exclusão de dados e restaure o aplicativo</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Clear Launches only */}
          <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Apagar Lançamentos</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                Exclui todos os lançamentos de transações cadastrados, preservando suas contas, cartões e categorias.
              </p>
            </div>
            <button
              onClick={handleClearLancamentos}
              className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-xs font-semibold rounded-[12px] transition-colors cursor-pointer shrink-0"
            >
              Apagar Lançamentos
            </button>
          </div>

          {/* Apagar Tudo */}
          <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="config-apagar-tudo-container">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Apagar Tudo</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                Apaga todos os dados de lançamentos, contas, cartões, cofrinhos e as categorias não padrão criadas, zerando completamente o aplicativo.
              </p>
            </div>
            <button
              id="btn-apagar-tudo-geral"
              onClick={handleEraseAllData}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-[12px] transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Apagar Tudo</span>
            </button>
          </div>

          {/* Reset All Data */}
          <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-general)]">Limpar Tudo</h4>
              <p className="text-[10px] text-[var(--text-discreto)] mt-0.5">
                Exclui de forma permanente todas as customizações (contas, cartões, categorias, cofrinhos) e restaura o Fluc para as configurações padrões.
              </p>
            </div>
            <button
              onClick={handleResetAllData}
              className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-[12px] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Trash2 size={12} />
              <span>Restaurar Padrões</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
