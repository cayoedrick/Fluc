import React, { useState } from 'react';
import { Categoria } from '../types';
import { Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { SyncStatusIcon } from './SyncStatusIcon';
import { CategoryIcon } from './CategoryIcon';

interface CategoriasViewProps {
  categorias: Categoria[];
  onUpdateCategorias: (cats: Categoria[]) => void;
  onOpenMenu?: () => void;
  onOpenSyncModal?: () => void;
}

export function CategoriasView({ categorias, onUpdateCategorias, onOpenMenu, onOpenSyncModal }: CategoriasViewProps) {
  // States for adding / editing
  const [newCatName, setNewCatName] = useState<string>('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>('');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    
    // Check duplication
    const duplicate = categorias.some(c => c.nome.toLowerCase() === newCatName.trim().toLowerCase());
    if (duplicate) {
      window.showToast?.('Já existe uma categoria com este nome.', 'erro');
      return;
    }

    const newCat: Categoria = {
      id: `cat-custom-${Date.now()}`,
      nome: newCatName.trim(),
      tipo: 'geral'
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

    const duplicate = categorias.some(c => c.id !== catId && c.nome.toLowerCase() === editingCatName.trim().toLowerCase());
    if (duplicate) {
      window.showToast?.('Já existe uma categoria com este nome.', 'erro');
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

  // Up/down buttons reordering
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categorias.length) return;

    const updatedFull = [...categorias];
    const element1 = categorias[index];
    const element2 = categorias[targetIndex];
    
    const fullIndex1 = updatedFull.findIndex(c => c.id === element1.id);
    const fullIndex2 = updatedFull.findIndex(c => c.id === element2.id);

    if (fullIndex1 !== -1 && fullIndex2 !== -1) {
      const temp = updatedFull[fullIndex1];
      updatedFull[fullIndex1] = updatedFull[fullIndex2];
      updatedFull[fullIndex2] = temp;
      onUpdateCategorias(updatedFull);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...categorias];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);

    onUpdateCategorias(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div id="categorias-container" className="w-full flex-1 flex flex-col space-y-6 select-none">
      
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

      {/* 2. Add New Category Input Block */}
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] space-y-3">
        <span className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider block">
          Nova Categoria
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

      {/* 3. List of Categories */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider">
            Categorias Cadastradas ({categorias.length})
          </h3>
          <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase">Arraste para Reordenar</span>
        </div>

        <div className="space-y-2">
          {categorias.map((cat, idx) => {
            const isEditing = editingCatId === cat.id;
            const isDragging = draggedIndex === idx;
            const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

            return (
              <div
                key={cat.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`bg-[var(--bg-primary)] border rounded-[20px] p-3.5 flex items-center justify-between gap-4 transition-all ${
                  isDragging 
                    ? 'opacity-40 border-dashed border-[var(--bg-secondary)] scale-[0.99]' 
                    : isDragOver
                      ? 'border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/10 shadow-md scale-[1.01]'
                      : 'border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)]/40'
                }`}
              >
                <div className="flex-1 flex items-center gap-3">
                  {/* Drag handle handle */}
                  <div 
                    className="cursor-grab active:cursor-grabbing text-[var(--text-discreto)] hover:text-[var(--text-general)] p-1 rounded-md"
                    title="Clique e arraste para reordenar"
                  >
                    <GripVertical size={18} />
                  </div>

                  <div className="p-2 rounded-[12px] bg-[var(--bg-secondary)]/15 text-[var(--text-general)] shrink-0">
                    <CategoryIcon name={cat.nome} icon={cat.icone} size={18} />
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
                    disabled={idx === categorias.length - 1}
                    className={`p-1.5 rounded-[8px] transition-colors ${
                      idx === categorias.length - 1 
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
