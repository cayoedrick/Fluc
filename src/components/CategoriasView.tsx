import React, { useState } from 'react';
import { Categoria } from '../types';
import { Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, Tag, TrendingUp, TrendingDown } from 'lucide-react';
import { SyncStatusIcon } from './SyncStatusIcon';

interface CategoriasViewProps {
  categorias: Categoria[];
  onUpdateCategorias: (cats: Categoria[]) => void;
  onOpenMenu?: () => void;
  onOpenSyncModal: () => void;
}

export function CategoriasView({ categorias, onUpdateCategorias, onOpenMenu, onOpenSyncModal }: CategoriasViewProps) {
  const [activeTab, setActiveTab] = useState<'receita' | 'despesa'>('receita');
  
  // States for adding / editing
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>('');

  const filteredCats = categorias.filter(c => c.tipo === activeTab);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    
    // Check duplication
    const duplicate = categorias.some(c => c.tipo === activeTab && c.nome.toLowerCase() === newCatName.trim().toLowerCase());
    if (duplicate) {
      alert('Já existe uma categoria com este nome.');
      return;
    }

    const newCat: Categoria = {
      id: `cat-custom-${Date.now()}`,
      nome: newCatName.trim(),
      tipo: activeTab
    };

    onUpdateCategorias([...categorias, newCat]);
    setNewCatName('');
  };

  const handleStartEdit = (cat: Categoria) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.nome);
  };

  const handleSaveEdit = (catId: string) => {
    if (!editingCatName.trim()) return;

    const duplicate = categorias.some(c => c.id !== catId && c.tipo === activeTab && c.nome.toLowerCase() === editingCatName.trim().toLowerCase());
    if (duplicate) {
      alert('Já existe uma categoria com este nome.');
      return;
    }

    const updated = categorias.map(c => c.id === catId ? { ...c, nome: editingCatName.trim() } : c);
    onUpdateCategorias(updated);
    setEditingCatId(null);
  };

  const handleDeleteCategory = (catId: string) => {
    const confirmDelete = window.confirm('Tem certeza de que deseja excluir esta categoria? Isso pode afetar os lançamentos vinculados.');
    if (confirmDelete) {
      const updated = categorias.filter(c => c.id !== catId);
      onUpdateCategorias(updated);
    }
  };

  // Reordering function: "organizar a ordem das categorias"
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredCats.length) return;

    // We need to reorder them in the original full array, preserving the order of other types
    // Let's copy the full list
    const updatedFull = [...categorias];
    
    // Find the elements in the full array
    const element1 = filteredCats[index];
    const element2 = filteredCats[targetIndex];
    
    const fullIndex1 = updatedFull.findIndex(c => c.id === element1.id);
    const fullIndex2 = updatedFull.findIndex(c => c.id === element2.id);

    // Swap
    if (fullIndex1 !== -1 && fullIndex2 !== -1) {
      const temp = updatedFull[fullIndex1];
      updatedFull[fullIndex1] = updatedFull[fullIndex2];
      updatedFull[fullIndex2] = temp;
      onUpdateCategorias(updatedFull);
    }
  };

  return (
    <div id="categorias-container" className="w-full flex-1 flex flex-col space-y-6">
      
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
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Categorias</h2>
          </div>
        </div>
        <SyncStatusIcon onClick={onOpenSyncModal} />
      </div>

      {/* 2. Toggle Tabbing (Receitas vs Despesas) */}
      <div className="flex bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-1.5 rounded-[18px] text-sm font-semibold max-w-sm">
        <button
          onClick={() => {
            setActiveTab('receita');
            setEditingCatId(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'receita'
              ? 'bg-[#00cc52] text-white'
              : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
          }`}
        >
          <TrendingUp size={16} />
          <span>Receitas</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('despesa');
            setEditingCatId(null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'despesa'
              ? 'bg-[#d03c4d] text-white'
              : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
          }`}
        >
          <TrendingDown size={16} />
          <span>Despesas</span>
        </button>
      </div>

      {/* 3. Add New Category Input Block */}
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] space-y-3">
        <span className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider block">
          Nova Categoria de {activeTab === 'receita' ? 'Receita' : 'Despesa'}
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: Freelance, Investimentos, Educação..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            className="flex-1 py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden focus:border-[var(--bg-secondary)]"
          />
          <button
            onClick={handleAddCategory}
            className="w-11 h-11 bg-[var(--bg-secondary)] hover:opacity-90 text-white font-bold rounded-[16px] flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Adicionar"
          >
            <Plus size={20} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 4. List of Categories */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider">
            Categorias Cadastradas ({filteredCats.length})
          </h3>
          <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase">Ordem de Exibição</span>
        </div>

        <div className="space-y-2">
          {filteredCats.map((cat, idx) => {
            const isEditing = editingCatId === cat.id;
            return (
              <div
                key={cat.id}
                className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[20px] p-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className={`p-2 rounded-[12px] ${activeTab === 'receita' ? 'bg-[#00cc52]/15 text-[#00cc52]' : 'bg-[#d03c4d]/15 text-[#d03c4d]'}`}>
                    <Tag size={16} />
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(cat.id)}
                      className="flex-1 py-1.5 px-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[10px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-bold text-[var(--text-general)]">
                      {cat.nome}
                    </span>
                  )}
                </div>

                {/* Actions: Reordering up/down, Edit, Delete */}
                <div className="flex items-center gap-1">
                  {/* Reorder Arrows */}
                  <button
                    onClick={() => handleMoveCategory(idx, 'up')}
                    disabled={idx === 0}
                    className={`p-1.5 rounded-[8px] transition-colors ${
                      idx === 0 
                        ? 'text-transparent cursor-default' 
                        : 'text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)]'
                    }`}
                    title="Mover para cima"
                  >
                    <ArrowUp size={14} className="stroke-[2.5]" />
                  </button>

                  <button
                    onClick={() => handleMoveCategory(idx, 'down')}
                    disabled={idx === filteredCats.length - 1}
                    className={`p-1.5 rounded-[8px] transition-colors ${
                      idx === filteredCats.length - 1 
                        ? 'text-transparent cursor-default' 
                        : 'text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)]'
                    }`}
                    title="Mover para baixo"
                  >
                    <ArrowDown size={14} className="stroke-[2.5]" />
                  </button>

                  <div className="w-px h-5 bg-[var(--bg-tertiary)] mx-1" />

                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1.5 text-green-500 hover:bg-[var(--bg-app)] rounded-[8px] transition-colors cursor-pointer"
                        title="Salvar"
                      >
                        <Check size={15} className="stroke-[2.5]" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 text-red-500 hover:bg-[var(--bg-app)] rounded-[8px] transition-colors cursor-pointer"
                        title="Cancelar"
                      >
                        <X size={15} className="stroke-[2.5]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)] rounded-[8px] transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-[var(--text-discreto)] hover:text-red-500 hover:bg-[var(--bg-app)] rounded-[8px] transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
