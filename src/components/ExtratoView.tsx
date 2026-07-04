import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Conta, Cartao, Categoria, Lancamento } from '../types';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  CreditCard,
  X,
  Search,
  Wallet,
  Edit2,
  Trash2,
  Info
} from 'lucide-react';
import { EditLancamentoModal } from './EditLancamentoModal';
import { FloatingInfoModal } from './FloatingInfoModal';
import { SyncStatusIcon } from './SyncStatusIcon';

interface ExtratoViewProps {
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  lancamentos: Lancamento[];
  onOpenAddModal: () => void;
  onOpenSyncModal: () => void;
  isDateInMonthYear: (dateStr: string, monthYearStr: string) => boolean;
  onDeleteLancamento?: (id: string, mode: 'este' | 'futuros' | 'todos') => void;
  onEditLancamento?: (id: string, updatedFields: Partial<Lancamento>, mode: 'este' | 'futuros' | 'todos') => void;
  onOpenMenu?: () => void;
}

export function ExtratoView({
  contas,
  cartoes,
  categorias,
  lancamentos,
  onOpenAddModal,
  onOpenSyncModal,
  isDateInMonthYear,
  onDeleteLancamento,
  onEditLancamento,
  onOpenMenu
}: ExtratoViewProps) {
  
  // Date Month/Year selection
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`;
  });

  // Sorting states
  const [sortBy, setSortBy] = useState<'data' | 'valor' | 'nome' | 'parcelados'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit State
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);

  // Delete State
  const [deletingLancamento, setDeletingLancamento] = useState<Lancamento | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const handleStartEdit = (l: Lancamento) => {
    setEditingLancamento(l);
    setIsEditOpen(true);
  };

  const handleStartDelete = (l: Lancamento) => {
    setDeletingLancamento(l);
    setShowDeleteConfirm(true);
  };

  // Expand/collapse filters toggler
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Tab filter: 'contas' or 'cartoes'
  const [activeTab, setActiveTab] = useState<'contas' | 'cartoes'>('contas');

  // Sub filters: specific account ID or card ID (or 'all')
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');

  // Type filter: 'all' | 'receita' | 'despesa' | 'transferencia'
  const [selectedType, setSelectedType] = useState<'all' | 'receita' | 'despesa' | 'transferencia'>('all');

  // Search filter query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toggle to search all months
  const [searchAllMonths, setSearchAllMonths] = useState<boolean>(false);
  const [showSearchAllMonthsInfo, setShowSearchAllMonthsInfo] = useState<boolean>(false);

  // Direction state for month sliding animation (1 = next, -1 = prev)
  const [direction, setDirection] = useState<number>(0);

  // Slide transition variants for month switching
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 150 : dir < 0 ? -150 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -150 : dir < 0 ? 150 : 0,
      opacity: 0,
    }),
  };

  // Handle month adjustment
  const handleMonthChange = (dir: 'prev' | 'next') => {
    setDirection(dir === 'next' ? 1 : -1);
    const [year, month] = currentDate.split('-').map(Number);
    let targetMonth = dir === 'prev' ? month - 1 : month + 1;
    let targetYear = year;
    
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    } else if (targetMonth === 13) {
      targetMonth = 1;
      targetYear += 1;
    }

    setCurrentDate(`${targetYear}-${String(targetMonth).padStart(2, '0')}`);
  };

  const getMonthNamePortuguese = (monthYearStr: string) => {
    const [year, month] = monthYearStr.split('-').map(Number);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[month - 1]} de ${year}`;
  };

  // Filter calculations & stats
  const filteredLancamentos = lancamentos.filter((l) => {
    // 1. Month-Year check
    // If searchAllMonths is active, we bypass the month filter
    if (!searchAllMonths && !isDateInMonthYear(l.data, currentDate)) return false;

    // 2. Tab and Entity check
    if (activeTab === 'contas') {
      if (l.tipo === 'despesa_cartao') return false; 
      if (selectedEntityId !== 'all') {
        if (l.tipo === 'transferencia') {
          if (l.contaId !== selectedEntityId && l.paraContaId !== selectedEntityId) return false;
        } else {
          if (l.contaId !== selectedEntityId) return false;
        }
      }
    } else {
      if (l.tipo !== 'despesa_cartao') return false;
      if (selectedEntityId !== 'all') {
        if (l.cartaoId !== selectedEntityId) return false;
      }
    }

    // 3. Type check
    if (selectedType !== 'all') {
      if (selectedType === 'receita') {
        if (l.tipo !== 'receita') return false;
      } else if (selectedType === 'despesa') {
        if (l.tipo !== 'despesa' && l.tipo !== 'despesa_cartao') return false;
      } else if (selectedType === 'transferencia') {
        if (l.tipo !== 'transferencia') return false;
      }
    }

    // 4. Text and Value search check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qNoAccents = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const qNormalizedVal = q.replace(',', '.');

      const desc = l.descricao.toLowerCase();
      const descNoAccents = desc.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const catName = categorias.find(c => c.id === l.categoriaId)?.nome.toLowerCase() || '';
      const catNameNoAccents = catName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const valStr = l.valor.toString();
      const valFmtBr = l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const valFmtBrPlain = valFmtBr.replace(/\./g, ''); // remove thousands separator

      const match = desc.includes(q) || 
                    descNoAccents.includes(qNoAccents) ||
                    catName.includes(q) || 
                    catNameNoAccents.includes(qNoAccents) ||
                    valStr.includes(q) || 
                    valStr.includes(qNormalizedVal) ||
                    valFmtBr.includes(q) ||
                    valFmtBrPlain.includes(q.replace(/\./g, ''));

      if (!match) return false;
    }

    return true;
  });

  // Sorting logic
  const sortedLancamentos = [...filteredLancamentos].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'data') {
      comparison = a.data.localeCompare(b.data);
    } else if (sortBy === 'valor') {
      comparison = a.valor - b.valor;
    } else if (sortBy === 'nome') {
      comparison = a.descricao.localeCompare(b.descricao, 'pt-BR');
    } else if (sortBy === 'parcelados') {
      const aVal = a.parcelado ? 1 : 0;
      const bVal = b.parcelado ? 1 : 0;
      comparison = aVal - bVal;
    }

    if (comparison === 0) {
      return b.data.localeCompare(a.data);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Total entries and exits calculations
  let totalEntradas = 0;
  let totalSaidas = 0;

  filteredLancamentos.forEach((l) => {
    if (l.tipo === 'receita') {
      if (l.recebidoPagoEfetivado) totalEntradas += l.valor;
    } else if (l.tipo === 'despesa') {
      if (l.recebidoPagoEfetivado) totalSaidas += l.valor;
    } else if (l.tipo === 'despesa_cartao') {
      if (l.estorno) {
        totalEntradas += l.valor; // refund increases entries
      } else {
        totalSaidas += l.valor; // purchase increases exits
      }
    }
  });

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
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Extrato</h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-white flex items-center justify-center hover:opacity-90 transition-all cursor-pointer"
            title="Adicionar Lançamento"
          >
            <Plus size={20} className="stroke-[2.5]" />
          </button>
          <SyncStatusIcon onClick={onOpenSyncModal} />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentDate}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            const threshold = 50;
            if (info.offset.x < -threshold) {
              handleMonthChange('next');
            } else if (info.offset.x > threshold) {
              handleMonthChange('prev');
            }
          }}
          className="w-full flex-1 flex flex-col space-y-6 touch-pan-y"
        >
          {/* 2. Selection Tabs: Contas vs Cartões (Always Visible) */}
          <div className="flex bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-1 rounded-[18px] text-xs font-bold w-full max-w-md">
            <button
              onClick={() => {
                setActiveTab('contas');
                setSelectedEntityId('all');
              }}
              className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'contas' ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              <Wallet size={14} />
              <span>Contas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('cartoes');
                setSelectedEntityId('all');
              }}
              className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'cartoes' ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              <CreditCard size={14} />
              <span>Cartões</span>
            </button>
          </div>

          {/* 3. Top month/year bar & Collapse filter trigger */}
          <div className="flex items-center justify-between gap-4 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-3 rounded-[20px]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMonthChange('prev')}
            className="p-1.5 hover:bg-[var(--bg-app)] text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} className="stroke-[2.5]" />
          </button>
          <span className="text-sm font-extrabold text-[var(--text-general)] shrink-0">
            {getMonthNamePortuguese(currentDate)}
          </span>
          <button
            onClick={() => handleMonthChange('next')}
            className="p-1.5 hover:bg-[var(--bg-app)] text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
          >
            <ChevronRight size={18} className="stroke-[2.5]" />
          </button>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] bg-[var(--bg-app)] py-2 px-3 rounded-[12px] border border-[var(--bg-tertiary)] transition-colors cursor-pointer"
        >
          <Filter size={14} />
          <span>Filtros</span>
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expandable filters panel */}
      {showFilters && (
        <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] space-y-4">
          
          {/* B. Specific Account / Credit Card Selector */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-2">
              {activeTab === 'contas' ? 'Selecione a Conta' : 'Selecione o Cartão'}
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                onClick={() => setSelectedEntityId('all')}
                className={`px-3 py-1.5 tag-flat transition-colors shrink-0 ${
                  selectedEntityId === 'all'
                    ? 'bg-[var(--bg-secondary)] text-white'
                    : 'bg-[var(--bg-app)] border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                }`}
              >
                Todos
              </button>
              {activeTab === 'contas' ? (
                contas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedEntityId(c.id)}
                    className={`px-3 py-1.5 tag-flat border transition-colors shrink-0 flex items-center gap-1 ${
                      selectedEntityId === c.id
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-general)] border-[var(--text-discreto)]'
                        : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.cor }} />
                    {c.nome}
                  </button>
                ))
              ) : (
                cartoes.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedEntityId(card.id)}
                    className={`px-3 py-1.5 tag-flat border transition-colors shrink-0 flex items-center gap-1 ${
                      selectedEntityId === card.id
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-general)] border-[var(--text-discreto)]'
                        : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.cor }} />
                    {card.nome}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* C. Entry Type Filter (Todos, Receitas, Despesas, Transferências) */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-2">Tipo de Transação</span>
            <div className="flex gap-1.5 text-xs font-bold">
              {([
                { id: 'all', label: 'Todos' },
                { id: 'receita', label: 'Receitas' },
                { id: 'despesa', label: 'Despesas' },
                { id: 'transferencia', label: 'Transferências' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`flex-1 py-2 text-center tag-flat transition-colors ${
                    selectedType === t.id
                      ? 'bg-[var(--bg-secondary)] text-white'
                      : 'bg-[var(--bg-app)] border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* D. Query text search input and Toggle Switch */}
          <div id="extrato-search-container" className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-discreto)]" />
              <input
                type="text"
                placeholder="Buscar descrição ou valor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-9 pr-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] text-xs text-[var(--text-general)] focus:outline-hidden"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-[var(--text-discreto)] hover:text-[var(--text-general)]">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] px-3 py-1.5 rounded-[14px] h-[36px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">Todos</span>
                <button
                  onClick={() => setSearchAllMonths(!searchAllMonths)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    searchAllMonths ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                  }`}
                  title="Buscar em todos os meses"
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      searchAllMonths ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-center">
                <button
                  id="info-trigger-button"
                  type="button"
                  onClick={() => setShowSearchAllMonthsInfo(true)}
                  className="p-1.5 rounded-xl hover:bg-[var(--bg-primary)] text-[var(--text-discreto)] hover:text-[var(--text-general)] transition-colors border border-transparent hover:border-[var(--bg-tertiary)] cursor-pointer"
                  title="Ajuda sobre a busca"
                >
                  <Info size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* E. Sort Filter (Ordenar por) */}
          <div>
            <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-2">Ordenar por</span>
            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              {([
                { id: 'data', label: 'Data' },
                { id: 'valor', label: 'Valor' },
                { id: 'nome', label: 'Nome' },
                { id: 'parcelados', label: 'Parcelados' }
              ] as const).map((opt) => {
                const isActive = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`sort-btn-${opt.id}`}
                    onClick={() => {
                      if (isActive) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(opt.id);
                        if (opt.id === 'nome') {
                          setSortOrder('asc');
                        } else {
                          setSortOrder('desc');
                        }
                      }
                    }}
                    className={`px-3 py-2 flex items-center gap-1.5 rounded-[12px] transition-colors border cursor-pointer ${
                      isActive
                        ? 'bg-[var(--bg-secondary)] border-transparent text-white'
                        : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && (
                      sortOrder === 'asc' 
                        ? <ChevronUp size={12} className="stroke-[2.5]" /> 
                        : <ChevronDown size={12} className="stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 3. Summary Widget: Total Entradas & Total Saídas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Entradas */}
        <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[#00cc52]/10 text-[#00cc52]">
              <TrendingUp size={16} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">Total Entradas</span>
              <span className="text-sm font-extrabold text-[#00cc52]">
                R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[#d03c4d]/10 text-[#d03c4d]">
              <TrendingDown size={16} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">Total Saídas</span>
              <span className="text-sm font-extrabold text-[#d03c4d]">
                R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Transactions List */}
      <div id="extrato-transactions-list" className="space-y-2.5">
        <h3 className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">
          Lista de Lançamentos ({filteredLancamentos.length})
        </h3>

        {filteredLancamentos.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] p-10 text-center text-[var(--text-discreto)]">
            <p className="text-sm font-medium">Nenhum lançamento corresponde aos filtros ativos.</p>
            <p className="text-xs mt-1">Experimente mudar o mês ou limpar os filtros de pesquisa.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedLancamentos.map((l) => {
              const cat = categorias.find((c) => c.id === l.categoriaId);
              const isRec = l.tipo === 'receita';
              const isCard = l.tipo === 'despesa_cartao';
              const isTransf = l.tipo === 'transferencia';
              const isPaid = l.recebidoPagoEfetivado;

              let textClass = 'text-[var(--text-general)]';
              if (isRec) textClass = 'text-[#00cc52]';
              if (l.tipo === 'despesa') textClass = 'text-[#d03c4d]';
              if (isCard) textClass = 'text-[#ed793a]';
              if (isTransf) textClass = 'text-[#1c7ae4]';

              const originDestName = isTransf
                ? `${contas.find(c => c.id === l.contaId)?.nome || 'Conta'} ➔ ${contas.find(c => c.id === l.paraContaId)?.nome || 'Conta'}`
                : isCard
                  ? cartoes.find(cr => cr.id === l.cartaoId)?.nome || 'Cartão'
                  : contas.find(c => c.id === l.contaId)?.nome || 'Sem conta';

              return (
                <div 
                  key={l.id}
                  className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[20px] p-4 flex justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-[12px] ${
                      isRec ? 'bg-[#00cc52]/10 text-[#00cc52]' :
                      isCard ? 'bg-[#ed793a]/10 text-[#ed793a]' :
                      isTransf ? 'bg-[#1c7ae4]/10 text-[#1c7ae4]' :
                      'bg-[#d03c4d]/10 text-[#d03c4d]'
                    }`}>
                      {isRec ? <TrendingUp size={16} /> :
                       isCard ? <CreditCard size={16} /> :
                       isTransf ? <ArrowRightLeft size={16} /> :
                       <TrendingDown size={16} />}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-general)]">{l.descricao}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[var(--text-discreto)] mt-0.5">
                        <span className="uppercase tracking-wider">{cat?.nome || (isTransf ? 'Transferência' : 'Geral')}</span>
                        <span>•</span>
                        <span>{originDestName || 'Nenhum'}</span>
                        {!isPaid && !isCard && (
                          <span className="text-[#ed793a] bg-[#ed793a]/10 px-1 py-0.5 rounded-[4px] uppercase text-[8px]">Pendente</span>
                        )}
                        {l.fixoRecorrente && (
                          <span className="bg-[var(--bg-tertiary)] px-1 py-0.5 rounded-[4px] uppercase text-[8px]">Fixo</span>
                        )}
                        {l.parcelado && (
                          <span className="bg-[var(--bg-tertiary)] px-1 py-0.5 rounded-[4px] uppercase text-[8px]">Parcelado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[var(--text-discreto)]">
                        {l.data.split('-').reverse().join('/')}
                      </p>
                      <p className={`text-sm font-extrabold whitespace-nowrap ${textClass}`}>
                        {isRec ? '+' : isCard && l.estorno ? '+' : '-'} R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" id={`lanc-actions-${l.id}`}>
                      <button
                        onClick={() => handleStartEdit(l)}
                        className="p-1.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-[8px] border border-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        title="Editar lançamento"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleStartDelete(l)}
                        className="p-1.5 bg-[var(--bg-app)] hover:bg-red-500/15 text-[var(--text-discreto)] hover:text-red-500 rounded-[8px] border border-[var(--bg-tertiary)] hover:border-red-500/20 transition-colors cursor-pointer"
                        title="Apagar lançamento"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </motion.div>
      </AnimatePresence>

      {/* Edit Transaction Modal */}
      {isEditOpen && editingLancamento && (
        <EditLancamentoModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingLancamento(null);
          }}
          lancamento={editingLancamento}
          contas={contas}
          cartoes={cartoes}
          categorias={categorias}
          onSave={(id, updatedFields, mode) => {
            if (onEditLancamento) {
              onEditLancamento(id, updatedFields, mode);
              alert('Lançamento atualizado com sucesso!');
            }
          }}
        />
      )}

      {/* Delete Confirmation Overlay Modal */}
      {showDeleteConfirm && deletingLancamento && (() => {
        const isGrouped = !!deletingLancamento.grupoId;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="delete-confirm-modal">
            <div className="w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-5 text-center">
              <div>
                <span className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={22} className="stroke-[2.5]" />
                </span>
                <h4 className="text-sm font-bold text-[var(--text-general)]">
                  {isGrouped ? "Como deseja apagar este lançamento?" : "Deseja realmente apagar este lançamento?"}
                </h4>
                <p className="text-xs text-[var(--text-general)] font-semibold mt-2 bg-[var(--bg-app)] py-1.5 px-3 rounded-[10px] border border-[var(--bg-tertiary)] inline-block">
                  {deletingLancamento.descricao}
                </p>
                <p className="text-[11px] text-[var(--text-discreto)] mt-2">
                  {isGrouped 
                    ? 'Escolha se deseja apagar somente esta ocorrência ("Este"), esta e as futuras ("Este e Futuros"), ou apagar todas as ocorrências passadas, presentes e futuras ("Todo o Lançamento").'
                    : 'Esta ação não poderá ser desfeita.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {isGrouped ? (
                  <>
                    <button
                      id="delete-btn-este"
                      onClick={() => {
                        if (onDeleteLancamento) {
                          onDeleteLancamento(deletingLancamento.id, 'este');
                          alert('Lançamento apagado com sucesso!');
                        }
                        setShowDeleteConfirm(false);
                        setDeletingLancamento(null);
                      }}
                      className="w-full py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                    >
                      Apagar apenas "Este"
                    </button>

                    <button
                      id="delete-btn-futuros"
                      onClick={() => {
                        if (onDeleteLancamento) {
                          onDeleteLancamento(deletingLancamento.id, 'futuros');
                          alert('Este lançamento e todas as recorrências futuras foram apagados com sucesso!');
                        }
                        setShowDeleteConfirm(false);
                        setDeletingLancamento(null);
                      }}
                      className="w-full py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                    >
                      Apagar "Este e Futuros"
                    </button>

                    <button
                      id="delete-btn-todos"
                      onClick={() => {
                        if (onDeleteLancamento) {
                          onDeleteLancamento(deletingLancamento.id, 'todos');
                          alert('Todo o lançamento (passados, presente e futuros) foi apagado com sucesso!');
                        }
                        setShowDeleteConfirm(false);
                        setDeletingLancamento(null);
                      }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                    >
                      Apagar "Todo o Lançamento" (Passado/Presente/Futuro)
                    </button>
                  </>
                ) : (
                  <button
                    id="delete-btn-confirm"
                    onClick={() => {
                      if (onDeleteLancamento) {
                        onDeleteLancamento(deletingLancamento.id, 'este');
                        alert('Lançamento apagado com sucesso!');
                      }
                      setShowDeleteConfirm(false);
                      setDeletingLancamento(null);
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer"
                  >
                    Confirmar Exclusão
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--bg-tertiary)]">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingLancamento(null);
                  }}
                  className="text-xs font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] py-1 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Info Modal */}
      <FloatingInfoModal
        isOpen={showSearchAllMonthsInfo}
        onClose={() => setShowSearchAllMonthsInfo(false)}
        title="Busca Abrangente"
        subtitle="Modo Histórico"
        icon={<Info size={20} />}
        description="Entenda como funciona o filtro de busca ampliada:"
        bullets={[
          {
            title: "Filtro de Mês Ativo (Desativado)",
            text: "Por padrão, o aplicativo exibe apenas as transações e buscas do mês atualmente selecionado."
          },
          {
            title: "Pesquisar em Todos os Meses (Ativado)",
            text: "A busca ignora o mês selecionado e varre todo o seu histórico de lançamentos cadastrado, ajudando você a encontrar qualquer registro do passado ou futuro."
          }
        ]}
      />
    </div>
  );
}
