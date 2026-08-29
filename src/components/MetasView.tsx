import React, { useState, useMemo } from 'react';
import { FlucState, MetaFinanceira, MetaContribuicao, Categoria } from '../types';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { Plus, Target, CheckCircle2, AlertTriangle, ArrowRight, X, TrendingUp, TrendingDown, Info, Shield, Pencil, Trash2, PauseCircle, PlayCircle, Layers, Calendar, Clock, DollarSign, ChevronRight } from 'lucide-react';

interface MetasViewProps {
  state: FlucState;
  setState: React.Dispatch<React.SetStateAction<FlucState>>;
  currentDate: string | null;
}

export function MetasView({ state, setState, currentDate }: MetasViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedMetaId, setSelectedMetaId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todas' | 'em_andamento' | 'pausada' | 'concluida'>('todas');

  // Edit Meta States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editStep, setEditStep] = useState(1);

  // Form states
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [valorDesejado, setValorDesejado] = useState('');
  const [valorAcumulado, setValorAcumulado] = useState('');
  const [dataDesejada, setDataDesejada] = useState('');
  const [prioridade, setPrioridade] = useState<'baixa'|'media'|'alta'>('media');
  const [status, setStatus] = useState<'em_andamento'|'pausada'|'concluida'>('em_andamento');
  const [maxMensal, setMaxMensal] = useState('');
  const [categoriasProtegidas, setCategoriasProtegidas] = useState<string[]>([]);

  // Contribute state
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [contributeValue, setContributeValue] = useState('');
  
  // Calculate averages over the last 3 months
  const averages = useMemo(() => {
    const now = new Date();
    let totalReceitas = 0;
    let totalDespesas = 0;
    let mesesCount = 3;
    
    // We get the 3 months previous to current
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${d.getFullYear()}-${mm}`;
      
      const receitasMes = state.lancamentos.filter(l => l.tipo === 'receita' && l.data.startsWith(prefix) && (!l.isShared || l.id.startsWith('reimb-'))).reduce((acc, l) => acc + l.valor, 0);
      const despesasLanc = state.lancamentos.filter(l => l.tipo === 'despesa' && l.data.startsWith(prefix)).reduce((acc, l) => acc + l.valor, 0);
      const despesasCartao = state.lancamentos.filter(l => l.tipo === 'despesa_cartao' && !l.estorno && l.dataCompra?.startsWith(prefix)).reduce((acc, l) => acc + l.valor, 0);
      
      totalReceitas += receitasMes;
      totalDespesas += despesasLanc + despesasCartao;
    }
    
    return {
      receitas: totalReceitas / mesesCount,
      despesas: totalDespesas / mesesCount,
      saldo: (totalReceitas - totalDespesas) / mesesCount
    };
  }, [state.lancamentos]);

  // Comprehensive Multi-Goal Planning Engine
  const metasOverview = useMemo(() => {
    const allMetas = state.metas || [];
    const activeMetas = allMetas.filter(m => (!m.status || m.status === 'em_andamento'));
    const pausedMetas = allMetas.filter(m => m.status === 'pausada');
    const completedMetas = allMetas.filter(m => m.status === 'concluida');

    const now = new Date();
    
    // Calculate per-meta baseline values
    const calculations = allMetas.map(meta => {
      const acumulado = meta.valorAcumulado || 0;
      const desejado = meta.valorDesejado || 0;
      const restante = Math.max(0, desejado - acumulado);
      
      let months = 1;
      if (meta.dataDesejada) {
        const endD = new Date(meta.dataDesejada);
        months = (endD.getFullYear() - now.getFullYear()) * 12 + (endD.getMonth() - now.getMonth());
        if (months <= 0) months = 1;
      }
      
      const requiredMonthly = restante / months;
      const effectiveMonthlyTarget = (meta.valorMensalDefinido && meta.valorMensalDefinido > 0)
        ? meta.valorMensalDefinido
        : requiredMonthly;
      
      const weight = meta.prioridade === 'alta' ? 3 : meta.prioridade === 'baixa' ? 1 : 2;
      const isActive = (!meta.status || meta.status === 'em_andamento');

      return {
        id: meta.id,
        meta,
        acumulado,
        desejado,
        restante,
        months,
        requiredMonthly,
        effectiveMonthlyTarget,
        weight,
        isActive
      };
    });

    const activeCalcs = calculations.filter(c => c.isActive);
    const totalRequiredMonthlyActive = activeCalcs.reduce((acc, c) => acc + c.effectiveMonthlyTarget, 0);
    const totalPriorityWeightActive = activeCalcs.reduce((acc, c) => acc + c.weight, 0) || 1;
    const saldoDisponivel = Math.max(0, averages.saldo);
    const deficitGlobal = Math.max(0, totalRequiredMonthlyActive - averages.saldo);
    const saldoLivreAposMetas = averages.saldo - totalRequiredMonthlyActive;
    const isGlobalOverloaded = totalRequiredMonthlyActive > averages.saldo;

    // Detailed per-meta plans taking other metas into account
    const plansMap = new Map<string, {
      meta: MetaFinanceira;
      restante: number;
      months: number;
      requiredMonthly: number;
      effectiveMonthlyTarget: number;
      allocatedMonthly: number;
      priorityWeight: number;
      otherActiveMetasCount: number;
      otherActiveMetasRequired: number;
      remainingSurplusForThisMeta: number;
      otherActiveMetas: { id: string; nome: string; monthly: number; prioridade: string }[];
      viability: 'viavel' | 'concorrencia' | 'dificil' | 'pausada' | 'concluida';
      viabilityReason: string;
      suggestedExtensionMonths: number;
    }>();

    calculations.forEach(calc => {
      if (!calc.isActive) {
        plansMap.set(calc.id, {
          meta: calc.meta,
          restante: calc.restante,
          months: calc.months,
          requiredMonthly: calc.requiredMonthly,
          effectiveMonthlyTarget: calc.effectiveMonthlyTarget,
          allocatedMonthly: 0,
          priorityWeight: calc.weight,
          otherActiveMetasCount: 0,
          otherActiveMetasRequired: 0,
          remainingSurplusForThisMeta: 0,
          otherActiveMetas: [],
          viability: calc.meta.status === 'concluida' ? 'concluida' : 'pausada',
          viabilityReason: calc.meta.status === 'concluida' ? 'Meta já concluída' : 'Meta pausada (não consome orçamento mensal)',
          suggestedExtensionMonths: 0
        });
        return;
      }

      const otherActives = activeCalcs.filter(c => c.id !== calc.id);
      const otherActiveMetasCount = otherActives.length;
      const otherActiveMetasRequired = otherActives.reduce((acc, c) => acc + c.effectiveMonthlyTarget, 0);
      const remainingSurplusForThisMeta = Math.max(0, averages.saldo - otherActiveMetasRequired);
      
      const otherActiveMetasList = otherActives.map(c => ({
        id: c.id,
        nome: c.meta.nome,
        monthly: c.effectiveMonthlyTarget,
        prioridade: c.meta.prioridade || 'media'
      }));

      // Weighted proportional share of monthly surplus
      const priorityShare = calc.weight / totalPriorityWeightActive;
      const allocatedMonthly = Math.min(calc.effectiveMonthlyTarget, saldoDisponivel * priorityShare);

      // Determine viability taking into consideration other metas
      let viability: 'viavel' | 'concorrencia' | 'dificil' | 'pausada' | 'concluida' = 'viavel';
      let viabilityReason = '';

      if (totalRequiredMonthlyActive <= averages.saldo) {
        viability = 'viavel';
        viabilityReason = otherActiveMetasCount > 0 
          ? `Totalmente viável. O saldo médio cobre esta e as outras ${otherActiveMetasCount} metas ativas.`
          : 'Totalmente viável com o saldo médio mensal disponível.';
      } else {
        if (calc.effectiveMonthlyTarget <= remainingSurplusForThisMeta) {
          viability = 'viavel';
          viabilityReason = `Viável mesmo com ${otherActiveMetasCount} outras metas ativas.`;
        } else if (calc.effectiveMonthlyTarget <= averages.saldo) {
          viability = 'concorrencia';
          viabilityReason = `Cabe no seu saldo médio, mas concorre com outras ${otherActiveMetasCount} metas ativas que somam R$ ${formatCurrency(otherActiveMetasRequired)}/mês.`;
        } else {
          viability = 'dificil';
          viabilityReason = `O aporte necessário (R$ ${formatCurrency(calc.effectiveMonthlyTarget)}/mês) excede seu saldo médio (R$ ${formatCurrency(averages.saldo)}/mês).`;
        }
      }

      // Extension suggestion if allocated rate is lower than required rate
      let suggestedExtensionMonths = 0;
      if (allocatedMonthly > 0 && allocatedMonthly < calc.requiredMonthly && calc.restante > 0) {
        const neededMonths = Math.ceil(calc.restante / allocatedMonthly);
        if (neededMonths > calc.months) {
          suggestedExtensionMonths = neededMonths - calc.months;
        }
      }

      plansMap.set(calc.id, {
        meta: calc.meta,
        restante: calc.restante,
        months: calc.months,
        requiredMonthly: calc.requiredMonthly,
        effectiveMonthlyTarget: calc.effectiveMonthlyTarget,
        allocatedMonthly,
        priorityWeight: calc.weight,
        otherActiveMetasCount,
        otherActiveMetasRequired,
        remainingSurplusForThisMeta,
        otherActiveMetas: otherActiveMetasList,
        viability,
        viabilityReason,
        suggestedExtensionMonths
      });
    });

    return {
      allMetas,
      activeMetas,
      pausedMetas,
      completedMetas,
      totalRequiredMonthlyActive,
      saldoLivreAposMetas,
      deficitGlobal,
      isGlobalOverloaded,
      plansMap
    };
  }, [state.metas, averages.saldo]);

  const handleCreate = () => {
    const valD = parseCurrencyInput(valorDesejado);
    const valA = parseCurrencyInput(valorAcumulado);
    const valM = parseCurrencyInput(maxMensal);
    
    if (!nome.trim() || valD <= 0) return;

    const novaMeta: MetaFinanceira = {
      id: `meta-${Date.now()}`,
      nome: nome.trim(),
      tipo,
      valorDesejado: valD,
      valorAcumulado: valA,
      dataInicio: new Date().toISOString().split('T')[0],
      dataDesejada,
      prioridade,
      valorMensalDefinido: valM,
      status: 'em_andamento',
      categoriasProtegidas,
      updatedAt: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      metas: [...(prev.metas || []), novaMeta]
    }));
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleSaveEdit = () => {
    if (!editingMetaId) return;
    const valD = parseCurrencyInput(valorDesejado);
    const valA = parseCurrencyInput(valorAcumulado);
    const valM = parseCurrencyInput(maxMensal);

    if (!nome.trim() || valD <= 0) return;

    setState(prev => ({
      ...prev,
      metas: (prev.metas || []).map(m => m.id === editingMetaId ? {
        ...m,
        nome: nome.trim(),
        tipo,
        valorDesejado: valD,
        valorAcumulado: valA,
        dataDesejada,
        prioridade,
        status,
        valorMensalDefinido: valM,
        categoriasProtegidas,
        updatedAt: Date.now()
      } : m)
    }));

    setIsEditOpen(false);
    setEditingMetaId(null);
    resetForm();
  };

  const openEditModal = (meta: MetaFinanceira, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMetaId(meta.id);
    setNome(meta.nome);
    setTipo(meta.tipo || '');
    setValorDesejado(meta.valorDesejado ? formatCurrency(meta.valorDesejado) : '');
    setValorAcumulado(meta.valorAcumulado ? formatCurrency(meta.valorAcumulado) : '');
    setDataDesejada(meta.dataDesejada || '');
    setPrioridade(meta.prioridade || 'media');
    setStatus(meta.status || 'em_andamento');
    setMaxMensal(meta.valorMensalDefinido ? formatCurrency(meta.valorMensalDefinido) : '');
    setCategoriasProtegidas(meta.categoriasProtegidas || []);
    setEditStep(1);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setCreateStep(1);
    setEditStep(1);
    setEditingMetaId(null);
    setNome('');
    setTipo('');
    setValorDesejado('');
    setValorAcumulado('');
    setDataDesejada('');
    setPrioridade('media');
    setStatus('em_andamento');
    setMaxMensal('');
    setCategoriasProtegidas([]);
  };

  const handleContribute = () => {
    if (!selectedMetaId) return;
    const val = parseCurrencyInput(contributeValue);
    if (isNaN(val) || val <= 0) return;
    
    const contribution: MetaContribuicao = {
      id: `mcont-${Date.now()}`,
      metaId: selectedMetaId,
      valor: val,
      data: new Date().toISOString().split('T')[0],
      updatedAt: Date.now()
    };
    
    setState(prev => ({
      ...prev,
      metaContribuicoes: [...(prev.metaContribuicoes || []), contribution],
      metas: (prev.metas || []).map(m => m.id === selectedMetaId ? { ...m, valorAcumulado: m.valorAcumulado + val } : m)
    }));
    
    setIsContributeOpen(false);
    setContributeValue('');
  };

  const deleteMeta = (id: string) => {
    setState(prev => ({
      ...prev,
      metas: (prev.metas || []).filter(m => m.id !== id),
      metaContribuicoes: (prev.metaContribuicoes || []).filter(c => c.metaId !== id)
    }));
    setSelectedMetaId(null);
  };

  const toggleMetaStatus = (meta: MetaFinanceira, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = meta.status === 'pausada' ? 'em_andamento' : 'pausada';
    setState(prev => ({
      ...prev,
      metas: (prev.metas || []).map(m => m.id === meta.id ? { ...m, status: newStatus, updatedAt: Date.now() } : m)
    }));
  };

  const filteredMetas = useMemo(() => {
    if (statusFilter === 'todas') return state.metas || [];
    if (statusFilter === 'em_andamento') return (state.metas || []).filter(m => !m.status || m.status === 'em_andamento');
    return (state.metas || []).filter(m => m.status === statusFilter);
  }, [state.metas, statusFilter]);

  const renderCreateModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-[var(--bg-tertiary)] flex justify-between items-center bg-[var(--bg-app)]">
            <h3 className="font-bold text-[var(--text-general)]">Criar Nova Meta</h3>
            <button onClick={() => { setIsCreateOpen(false); resetForm(); }} className="p-2 text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-full hover:bg-[var(--bg-tertiary)]/50 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {createStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-[var(--text-general)]">Etapa 1 — Objetivo</p>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DA META</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Comprar um computador" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">TIPO</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]">
                    <option value="">Selecione...</option>
                    <option value="reserva">Reserva de Emergência</option>
                    <option value="compra">Comprar um Produto</option>
                    <option value="viagem">Viagem</option>
                    <option value="divida">Quitar Dívida</option>
                    <option value="personalizado">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR TOTAL DESEJADO (R$)</label>
                  <input type="text" inputMode="decimal" value={valorDesejado} onChange={e => setValorDesejado(formatCurrencyInput(e.target.value))} placeholder="0,00" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" />
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-[var(--text-general)]">Etapa 2 — Situação Atual & Prazo</p>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR JÁ ACUMULADO (R$)</label>
                  <input type="text" inputMode="decimal" value={valorAcumulado} onChange={e => setValorAcumulado(formatCurrencyInput(e.target.value))} placeholder="0,00" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">DATA DESEJADA PARA ALCANÇAR</label>
                  <input type="date" value={dataDesejada} onChange={e => setDataDesejada(e.target.value)} className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" />
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-[var(--text-general)]">Etapa 3 — Prioridade & Concorrência</p>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">PRIORIDADE NO ORÇAMENTO</label>
                  <select value={prioridade} onChange={e => setPrioridade(e.target.value as any)} className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]">
                    <option value="alta">Alta (Maior alocação em caso de concorrência)</option>
                    <option value="media">Média (Alocação equilibrada)</option>
                    <option value="baixa">Baixa (Menor alocação em concorrência)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR MÁXIMO MENSAL (R$)</label>
                  <input type="text" inputMode="decimal" value={maxMensal} onChange={e => setMaxMensal(formatCurrencyInput(e.target.value))} placeholder="Deixe em branco para calcular automaticamente" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" />
                </div>
                
                {metasOverview.activeMetas.length > 0 && (
                  <div className="p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-general)]">
                      <Layers size={14} className="text-[#1c7ae4]" />
                      <span>Impacto em outras {metasOverview.activeMetas.length} metas ativas</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-discreto)] leading-relaxed">
                      Atualmente há R$ {formatCurrency(metasOverview.totalRequiredMonthlyActive)}/mês já comprometido em metas ativas. As sugestões de todas as metas serão recalibradas automaticamente.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-2">CATEGORIAS PROTEGIDAS (Não sugerir cortes)</label>
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-2">
                    {state.categorias.filter(c => c.tipo === 'despesa').map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--text-general)] cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={categoriasProtegidas.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoriasProtegidas([...categoriasProtegidas, c.id]);
                            } else {
                              setCategoriasProtegidas(categoriasProtegidas.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded border-[var(--bg-tertiary)]"
                        />
                        {c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[var(--bg-tertiary)] bg-[var(--bg-app)] flex justify-between items-center">
            {createStep > 1 ? (
              <button onClick={() => setCreateStep(createStep - 1)} className="px-4 py-2 rounded-[12px] text-sm font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)]">Voltar</button>
            ) : <div></div>}
            
            {createStep < 3 ? (
              <button disabled={!nome || !valorDesejado} onClick={() => setCreateStep(createStep + 1)} className="px-6 py-2 rounded-[12px] text-sm font-bold bg-[var(--bg-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">Próximo</button>
            ) : (
              <button onClick={handleCreate} className="px-6 py-2 rounded-[12px] text-sm font-bold bg-[#00cc52] text-white hover:opacity-90 transition-opacity cursor-pointer">Criar Plano</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
          <div className="p-4 border-b border-[var(--bg-tertiary)] flex justify-between items-center bg-[var(--bg-app)]">
            <div className="flex items-center gap-2">
              <Pencil size={18} className="text-[var(--bg-secondary)]" />
              <div>
                <h3 className="font-bold text-sm text-[var(--text-general)] leading-tight">Editar Meta</h3>
                <span className="text-[11px] text-[var(--text-discreto)]">Atualize dados e configurações do objetivo</span>
              </div>
            </div>
            <button 
              onClick={() => { setIsEditOpen(false); resetForm(); }} 
              className="p-2 text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-full hover:bg-[var(--bg-tertiary)]/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Stepper / Tab navigation */}
          <div className="flex border-b border-[var(--bg-tertiary)] bg-[var(--bg-app)] px-3 pt-2 gap-1 text-xs font-bold">
            <button
              onClick={() => setEditStep(1)}
              className={`flex-1 py-2 px-1 text-center rounded-t-xl transition-all ${
                editStep === 1
                  ? 'bg-[var(--bg-primary)] text-[var(--text-general)] border-t-2 border-[var(--bg-secondary)] shadow-xs'
                  : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              1. Objetivo
            </button>
            <button
              onClick={() => setEditStep(2)}
              className={`flex-1 py-2 px-1 text-center rounded-t-xl transition-all ${
                editStep === 2
                  ? 'bg-[var(--bg-primary)] text-[var(--text-general)] border-t-2 border-[var(--bg-secondary)] shadow-xs'
                  : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              2. Valores & Prazo
            </button>
            <button
              onClick={() => setEditStep(3)}
              className={`flex-1 py-2 px-1 text-center rounded-t-xl transition-all ${
                editStep === 3
                  ? 'bg-[var(--bg-primary)] text-[var(--text-general)] border-t-2 border-[var(--bg-secondary)] shadow-xs'
                  : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
              }`}
            >
              3. Preferências
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
            {editStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DA META</label>
                  <input 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    placeholder="Ex: Comprar um computador" 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">TIPO DE OBJETIVO</label>
                  <select 
                    value={tipo} 
                    onChange={e => setTipo(e.target.value)} 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)] cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option value="reserva">Reserva de Emergência</option>
                    <option value="compra">Comprar um Produto</option>
                    <option value="viagem">Viagem</option>
                    <option value="divida">Quitar Dívida</option>
                    <option value="personalizado">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">STATUS DA META</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'em_andamento', label: 'Em andamento', color: 'text-[#00cc52]' },
                      { id: 'pausada', label: 'Pausada', color: 'text-[#ed793a]' },
                      { id: 'concluida', label: 'Concluída', color: 'text-[#1c7ae4]' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatus(st.id as any)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          status === st.id
                            ? 'bg-[var(--bg-secondary)] text-white border-transparent shadow-xs'
                            : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                  {status === 'pausada' && (
                    <p className="text-[11px] text-[#ed793a] mt-1.5">
                      Ao pausar esta meta, seu aporte mensal deixará de concorrer com as outras metas ativas.
                    </p>
                  )}
                </div>
              </div>
            )}

            {editStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR TOTAL DESEJADO (R$)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={valorDesejado} 
                    onChange={e => setValorDesejado(formatCurrencyInput(e.target.value))} 
                    placeholder="0,00" 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)] font-bold" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR JÁ ACUMULADO (R$)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={valorAcumulado} 
                    onChange={e => setValorAcumulado(formatCurrencyInput(e.target.value))} 
                    placeholder="0,00" 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">DATA DESEJADA PARA ALCANÇAR</label>
                  <input 
                    type="date" 
                    value={dataDesejada} 
                    onChange={e => setDataDesejada(e.target.value)} 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" 
                  />
                </div>
              </div>
            )}

            {editStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">PRIORIDADE</label>
                  <select 
                    value={prioridade} 
                    onChange={e => setPrioridade(e.target.value as any)} 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)] cursor-pointer"
                  >
                    <option value="alta">Alta (Mais peso na partilha do saldo)</option>
                    <option value="media">Média (Partilha padrão)</option>
                    <option value="baixa">Baixa (Menor prioridade em aperto)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR MÁXIMO MENSAL (R$)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={maxMensal} 
                    onChange={e => setMaxMensal(formatCurrencyInput(e.target.value))} 
                    placeholder="Deixe em branco para cálculo automático" 
                    className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-2">CATEGORIAS PROTEGIDAS (Não sugerir cortes)</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {state.categorias.filter(c => c.tipo === 'despesa').map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-[var(--text-general)] cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={categoriasProtegidas.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoriasProtegidas([...categoriasProtegidas, c.id]);
                            } else {
                              setCategoriasProtegidas(categoriasProtegidas.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded border-[var(--bg-tertiary)]"
                        />
                        {c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[var(--bg-tertiary)] bg-[var(--bg-app)] flex items-center justify-between gap-2">
            <button 
              onClick={() => { setIsEditOpen(false); resetForm(); }} 
              className="px-4 py-2 rounded-[12px] text-xs font-bold text-[var(--text-discreto)] hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            
            <div className="flex items-center gap-2">
              {editStep > 1 && (
                <button 
                  onClick={() => setEditStep(editStep - 1)} 
                  className="px-3 py-2 rounded-[12px] text-xs font-bold bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer"
                >
                  Voltar
                </button>
              )}
              {editStep < 3 ? (
                <button 
                  onClick={() => setEditStep(editStep + 1)} 
                  className="px-4 py-2 rounded-[12px] text-xs font-bold bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer"
                >
                  Avançar
                </button>
              ) : null}
              <button 
                disabled={!nome.trim() || !valorDesejado} 
                onClick={handleSaveEdit} 
                className="px-5 py-2 rounded-[12px] text-xs font-bold bg-[#00cc52] text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMetaDetails = (meta: MetaFinanceira) => {
    const plan = metasOverview.plansMap.get(meta.id) || {
      meta,
      restante: Math.max(0, meta.valorDesejado - (meta.valorAcumulado || 0)),
      months: 1,
      requiredMonthly: meta.valorDesejado,
      effectiveMonthlyTarget: meta.valorDesejado,
      allocatedMonthly: meta.valorDesejado,
      priorityWeight: 2,
      otherActiveMetasCount: 0,
      otherActiveMetasRequired: 0,
      remainingSurplusForThisMeta: averages.saldo,
      otherActiveMetas: [],
      viability: 'viavel' as const,
      viabilityReason: 'Viável',
      suggestedExtensionMonths: 0
    };

    const pct = Math.min(100, ((meta.valorAcumulado || 0) / (meta.valorDesejado || 1)) * 100);
    const isPaused = meta.status === 'pausada';
    const isCompleted = meta.status === 'concluida';

    // Savings suggestions in unprotected categories
    const savingsCat = state.categorias
      .filter(c => c.tipo === 'despesa' && !(meta.categoriasProtegidas || []).includes(c.id))
      .map(c => {
        let catGastos = 0;
        let count = 0;
        const now = new Date();
        for (let i = 0; i < 3; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const prefix = `${d.getFullYear()}-${mm}`;
          catGastos += state.lancamentos.filter(l => l.categoriaId === c.id && l.data.startsWith(prefix)).reduce((acc, l) => acc + l.valor, 0);
          count++;
        }
        return { nome: c.nome, id: c.id, avg: catGastos / count };
      })
      .sort((a, b) => b.avg - a.avg);

    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-3xl p-6 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button 
            onClick={(e) => toggleMetaStatus(meta, e)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text-general)] bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)]/50 border border-[var(--bg-tertiary)] rounded-xl transition-colors cursor-pointer"
            title={isPaused ? "Reativar meta" : "Pausar meta"}
          >
            {isPaused ? <PlayCircle size={14} className="text-[#00cc52]" /> : <PauseCircle size={14} className="text-[#ed793a]" />}
            <span>{isPaused ? "Reativar" : "Pausar"}</span>
          </button>
          <button 
            onClick={() => openEditModal(meta)} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text-general)] bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)]/50 border border-[var(--bg-tertiary)] rounded-xl transition-colors cursor-pointer"
            title="Editar dados da meta"
          >
            <Pencil size={14} />
            <span>Editar</span>
          </button>
          <button 
            onClick={() => setSelectedMetaId(null)} 
            className="p-2 text-[var(--text-discreto)] hover:text-[var(--text-general)] bg-[var(--bg-app)] rounded-full transition-colors cursor-pointer"
          >
            <X size={16}/>
          </button>
        </div>

        <div className="pr-48">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-xl font-bold text-[var(--text-general)]">{meta.nome}</h3>
            {isPaused && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ed793a]/15 text-[#ed793a] border border-[#ed793a]/30">
                Pausada
              </span>
            )}
            {isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00cc52]/15 text-[#00cc52] border border-[#00cc52]/30">
                Concluída
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              meta.prioridade === 'alta' 
                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                : meta.prioridade === 'baixa' 
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-discreto)] border-transparent' 
                : 'bg-[#1c7ae4]/10 text-[#1c7ae4] border-[#1c7ae4]/20'
            }`}>
              Prioridade: {meta.prioridade === 'alta' ? 'Alta' : meta.prioridade === 'baixa' ? 'Baixa' : 'Média'}
            </span>
          </div>

          <p className="text-xs text-[var(--text-discreto)] mb-5 flex items-center gap-2 flex-wrap">
            {plan.viability === 'viavel' && <CheckCircle2 size={14} className="text-[#00cc52] shrink-0" />}
            {plan.viability === 'concorrencia' && <AlertTriangle size={14} className="text-[#f59e0b] shrink-0" />}
            {plan.viability === 'dificil' && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
            {plan.viability === 'pausada' && <PauseCircle size={14} className="text-[#ed793a] shrink-0" />}
            {plan.viability === 'concluida' && <CheckCircle2 size={14} className="text-[#00cc52] shrink-0" />}
            <span>
              Situação:{' '}
              <strong className={
                plan.viability === 'viavel' || plan.viability === 'concluida' ? 'text-[#00cc52]' :
                plan.viability === 'concorrencia' ? 'text-[#f59e0b]' :
                plan.viability === 'pausada' ? 'text-[#ed793a]' : 'text-red-500'
              }>
                {plan.viability === 'viavel' ? 'Viável' :
                 plan.viability === 'concorrencia' ? 'Concorrência de Metas' :
                 plan.viability === 'pausada' ? 'Pausada' :
                 plan.viability === 'concluida' ? 'Concluída' : 'Prazo Exigente'}
              </strong>
              {' '}&bull; {plan.viabilityReason}
            </span>
          </p>
        </div>

        {/* Top 4 Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Acumulado</p>
            <p className="text-lg font-extrabold text-[#00cc52]">R$ {formatCurrency(meta.valorAcumulado || 0)}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Faltam</p>
            <p className="text-lg font-extrabold text-[var(--text-general)]">R$ {formatCurrency(plan.restante)}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Necessário (mês)</p>
            <p className="text-lg font-extrabold text-[#1c7ae4]">R$ {formatCurrency(plan.requiredMonthly)}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Saldo Médio Livre</p>
            <p className="text-lg font-extrabold text-[var(--text-general)]">
              R$ {formatCurrency(plan.remainingSurplusForThisMeta)}
            </p>
          </div>
        </div>

        {/* Multi-goals competition alert banner */}
        {plan.otherActiveMetasCount > 0 && !isPaused && !isCompleted && (
          <div className={`p-4 rounded-2xl mb-6 border flex items-start gap-3 ${
            plan.viability === 'concorrencia' || metasOverview.isGlobalOverloaded
              ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
              : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)]'
          }`}>
            <Layers size={18} className={plan.viability === 'concorrencia' || metasOverview.isGlobalOverloaded ? 'text-[#f59e0b] shrink-0 mt-0.5' : 'text-[#1c7ae4] shrink-0 mt-0.5'} />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-general)]">
                  Conexão com outras {plan.otherActiveMetasCount} metas ativas
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[var(--bg-primary)] border border-[var(--bg-tertiary)]">
                  Total de todas as metas: R$ {formatCurrency(metasOverview.totalRequiredMonthlyActive)}/mês
                </span>
              </div>
              <p className="text-[var(--text-discreto)] leading-relaxed">
                As outras metas ativas demandam <strong>R$ {formatCurrency(plan.otherActiveMetasRequired)}/mês</strong>. 
                {metasOverview.isGlobalOverloaded ? (
                  <span className="text-[#f59e0b] font-semibold">
                    {' '}A soma de todas as metas excede seu saldo médio (R$ {formatCurrency(averages.saldo)}/mês) em R$ {formatCurrency(metasOverview.deficitGlobal)}/mês.
                  </span>
                ) : (
                  <span className="text-[#00cc52] font-semibold">
                    {' '}Seu saldo médio comporta todas as metas simultaneamente com R$ {formatCurrency(metasOverview.saldoLivreAposMetas)}/mês de folga.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-8">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-[var(--text-general)]">{pct.toFixed(1)}% concluído</span>
            <span className="text-[var(--text-discreto)]">Meta: R$ {formatCurrency(meta.valorDesejado)}</span>
          </div>
          <div className="h-4 bg-[var(--bg-app)] rounded-full overflow-hidden border border-[var(--bg-tertiary)]">
            <div className="h-full bg-gradient-to-r from-[#00cc52] to-[#14b8a6] transition-all duration-1000" style={{ width: `${pct}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Recomendado */}
          <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--bg-tertiary)] flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-[var(--text-general)] mb-4 flex items-center gap-2">
                <Target size={16} className="text-[#1c7ae4]" /> Plano e Sugestões para Esta Meta
              </h4>
              
              <ol className="space-y-3.5 text-xs text-[var(--text-general)]">
                <li className="flex gap-2">
                  <span className="font-bold text-[#1c7ae4]">1.</span> 
                  <span>
                    Aporte ideal por prazo: <strong className="text-[var(--text-general)]">R$ {formatCurrency(plan.requiredMonthly)}/mês</strong> até {meta.dataDesejada ? meta.dataDesejada.split('-').reverse().join('/') : 'o prazo'}.
                  </span>
                </li>

                {plan.otherActiveMetasCount > 0 && (
                  <li className="flex gap-2">
                    <span className="font-bold text-[#1c7ae4]">2.</span> 
                    <span>
                      Alocação ponderada por prioridade ({meta.prioridade || 'média'}):{' '}
                      <strong className="text-[#1c7ae4]">R$ {formatCurrency(plan.allocatedMonthly)}/mês</strong> recomendados do saldo atual.
                    </span>
                  </li>
                )}

                {plan.suggestedExtensionMonths > 0 && (
                  <li className="flex gap-2">
                    <span className="font-bold text-[#f59e0b]">3.</span> 
                    <span>
                      Opção de ajuste de prazo: estender o prazo em <strong className="text-[var(--text-general)]">+{plan.suggestedExtensionMonths} meses</strong> reduz o aporte mensal para R$ {formatCurrency(plan.allocatedMonthly)}/mês sem sobrecarregar as outras metas.
                    </span>
                  </li>
                )}

                {plan.otherActiveMetas.length > 0 && (plan.viability === 'concorrencia' || metasOverview.isGlobalOverloaded) && (
                  <li className="flex gap-2">
                    <span className="font-bold text-[#f59e0b]">4.</span> 
                    <span>
                      Se desejar priorizar esta meta, pausar temporariamente metas secundárias pode liberar até <strong className="text-[var(--text-general)]">R$ {formatCurrency(plan.otherActiveMetasRequired)}/mês</strong>.
                    </span>
                  </li>
                )}

                {savingsCat[0] && savingsCat[0].avg > 0 && (plan.viability !== 'viavel' || metasOverview.isGlobalOverloaded) && (
                  <li className="flex gap-2">
                    <span className="font-bold text-[#00cc52]">5.</span> 
                    <span>
                      Reduzir 10% (R$ {formatCurrency(savingsCat[0].avg * 0.1)}) em {savingsCat[0].nome} gera economia direta para os aportes.
                    </span>
                  </li>
                )}
              </ol>
            </div>
            
            <div className="mt-6 flex items-center gap-2 pt-2">
              <button 
                onClick={() => setIsContributeOpen(true)} 
                className="flex-1 bg-[#1c7ae4] text-white text-xs font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-center shadow-xs"
              >
                Adicionar Valor
              </button>
              <button 
                onClick={() => openEditModal(meta)} 
                className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-xl hover:bg-[var(--bg-tertiary)]/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil size={14} />
                Editar
              </button>
            </div>
          </div>

          {/* Sugestões de Economia & Metas Concorrentes */}
          <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--bg-tertiary)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-[var(--text-general)] flex items-center gap-2">
                  <Info size={16} className="text-[#f59e0b]" /> Sugestões de Economia e Concorrência
                </h4>
              </div>

              {/* Other active goals list */}
              {plan.otherActiveMetas.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">
                    Outras Metas Concorrentes ({plan.otherActiveMetas.length})
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                    {plan.otherActiveMetas.map(om => (
                      <div 
                        key={om.id}
                        onClick={() => setSelectedMetaId(om.id)}
                        className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] hover:border-[var(--bg-secondary)] cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-semibold text-[var(--text-general)] truncate max-w-[150px]">
                          {om.nome}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#1c7ae4]">
                            R$ {formatCurrency(om.monthly)}/mês
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-app)] text-[var(--text-discreto)] uppercase">
                            {om.prioridade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Savings in categories */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">
                  Sugestões de Redução em Despesas
                </span>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {savingsCat.filter(c => c.avg > 0).slice(0, 3).map((c, idx) => (
                    <div key={`saving-cat-${c.id || idx}`} className="flex justify-between items-center bg-[var(--bg-primary)] p-2 rounded-xl border border-[var(--bg-tertiary)]">
                      <span className="text-xs font-semibold text-[var(--text-general)] truncate max-w-[130px]">{c.nome}</span>
                      <div className="flex gap-1.5 text-[10px] font-bold">
                        <span className="bg-[#f59e0b]/10 text-[#f59e0b] px-2 py-0.5 rounded-md">-5%: R$ {formatCurrency(c.avg * 0.05)}</span>
                        <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md">-10%: R$ {formatCurrency(c.avg * 0.1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between border-t border-[var(--bg-tertiary)] pt-3">
              <button 
                onClick={() => openEditModal(meta)} 
                className="text-[11px] font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Pencil size={12} />
                Configurações da meta
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`Deseja realmente excluir a meta "${meta.nome}"? As sugestões de todas as outras metas serão reajustadas automaticamente.`)) {
                    deleteMeta(meta.id);
                  }
                }} 
                className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Trash2 size={12} />
                Excluir meta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Global Multi-Goal Budget Overview Card */}
      {state.metas && state.metas.length > 0 && (
        <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-3xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[var(--bg-tertiary)]">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#1c7ae4]" />
                <h3 className="font-bold text-base text-[var(--text-general)]">Planejamento Integrado de Metas</h3>
              </div>
              <p className="text-xs text-[var(--text-discreto)] mt-0.5">
                O orçamento e as sugestões ajustam-se dinamicamente conforme você cria, edita ou exclui metas.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-[var(--bg-secondary)] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus size={16} /> Nova Meta
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--bg-tertiary)]">
              <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">
                Compromisso Mensal em Metas
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-[#1c7ae4]">
                  R$ {formatCurrency(metasOverview.totalRequiredMonthlyActive)}
                </span>
                <span className="text-xs text-[var(--text-discreto)]">
                  ({metasOverview.activeMetas.length} {metasOverview.activeMetas.length === 1 ? 'ativa' : 'ativas'})
                </span>
              </div>
            </div>

            <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--bg-tertiary)]">
              <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">
                Saldo Médio Disponível
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-[var(--text-general)]">
                  R$ {formatCurrency(averages.saldo)}
                </span>
                <span className="text-xs text-[var(--text-discreto)]">/mês</span>
              </div>
            </div>

            <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--bg-tertiary)]">
              <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">
                Balanço do Orçamento
              </span>
              <div className="flex items-baseline gap-1.5">
                {metasOverview.isGlobalOverloaded ? (
                  <>
                    <span className="text-lg font-extrabold text-[#ed793a]">
                      Déficit R$ {formatCurrency(metasOverview.deficitGlobal)}
                    </span>
                    <span className="text-[10px] font-bold text-[#ed793a] bg-[#ed793a]/15 px-1.5 py-0.5 rounded">
                      Aperto
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-extrabold text-[#00cc52]">
                      Sobra R$ {formatCurrency(metasOverview.saldoLivreAposMetas)}
                    </span>
                    <span className="text-[10px] font-bold text-[#00cc52] bg-[#00cc52]/15 px-1.5 py-0.5 rounded">
                      Equilibrado
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--bg-tertiary)] overflow-x-auto custom-scrollbar">
            {[
              { id: 'todas', label: `Todas (${metasOverview.allMetas.length})` },
              { id: 'em_andamento', label: `Em andamento (${metasOverview.activeMetas.length})` },
              { id: 'pausada', label: `Pausadas (${metasOverview.pausedMetas.length})` },
              { id: 'concluida', label: `Concluídas (${metasOverview.completedMetas.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[var(--bg-secondary)] text-white'
                    : 'bg-[var(--bg-app)] border border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!state.metas || state.metas.length === 0 ? (
        <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)]/10 text-[var(--bg-secondary)] flex items-center justify-center mb-4">
            <Target size={32} />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-general)] mb-2">Nenhuma meta definida</h3>
          <p className="text-sm text-[var(--text-discreto)] mb-6 max-w-sm">
            Transforme seus planos em objetivos financeiros. Crie uma meta e descubra um caminho possível para alcançá-la.
          </p>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-[var(--bg-secondary)] text-white px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={18} /> Criar minha primeira meta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedMetaId ? (
            renderMetaDetails(state.metas.find(m => m.id === selectedMetaId)!)
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMetas.map(meta => {
                const plan = metasOverview.plansMap.get(meta.id);
                const pct = Math.min(100, ((meta.valorAcumulado || 0) / (meta.valorDesejado || 1)) * 100);
                const isPaused = meta.status === 'pausada';
                const isCompleted = meta.status === 'concluida';
                
                return (
                  <div 
                    key={meta.id} 
                    onClick={() => setSelectedMetaId(meta.id)} 
                    className="group bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-2xl cursor-pointer hover:border-[var(--bg-secondary)] transition-all relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[var(--text-general)] text-sm truncate">{meta.nome}</h4>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isPaused && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#ed793a]/15 text-[#ed793a]">
                              Pausada
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#00cc52]/15 text-[#00cc52]">
                              Concluída
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => openEditModal(meta, e)}
                            className="p-1 text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-app)] rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Editar meta"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-discreto)] mb-3 flex justify-between">
                        <span>R$ {formatCurrency(meta.valorAcumulado || 0)} de R$ {formatCurrency(meta.valorDesejado)}</span>
                        <span className="font-bold text-[#00cc52]">{pct.toFixed(0)}%</span>
                      </p>

                      <div className="h-2 bg-[var(--bg-app)] rounded-full overflow-hidden mb-3.5">
                        <div className="h-full bg-[#00cc52]" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--bg-tertiary)] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-[var(--text-discreto)]">
                        <Clock size={12} />
                        <span>R$ {formatCurrency(plan?.requiredMonthly || 0)}/mês</span>
                      </div>
                      
                      {plan?.viability === 'concorrencia' && (
                        <span className="text-[10px] font-bold text-[#f59e0b] flex items-center gap-1">
                          <AlertTriangle size={11} /> Concorrência
                        </span>
                      )}
                      {plan?.viability === 'viavel' && (
                        <span className="text-[10px] font-bold text-[#00cc52] flex items-center gap-1">
                          <CheckCircle2 size={11} /> Viável
                        </span>
                      )}
                      {plan?.viability === 'dificil' && (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                          <AlertTriangle size={11} /> Exigente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div 
                onClick={() => setIsCreateOpen(true)} 
                className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] border-dashed p-5 rounded-2xl cursor-pointer hover:bg-[var(--bg-primary)] transition-colors flex flex-col items-center justify-center min-h-[140px] text-[var(--text-discreto)] hover:text-[var(--text-general)]"
              >
                <Plus size={24} className="mb-2" />
                <span className="text-xs font-bold">Nova Meta</span>
              </div>
            </div>
          )}
        </div>
      )}

      {isCreateOpen && renderCreateModal()}
      {isEditOpen && renderEditModal()}

      {isContributeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-4">
            <h3 className="font-bold text-[var(--text-general)] text-center">Adicionar Valor</h3>
            <p className="text-xs text-[var(--text-discreto)] text-center">Quanto você deseja adicionar à sua meta agora?</p>
            <input type="text" inputMode="decimal" value={contributeValue} onChange={e => setContributeValue(formatCurrencyInput(e.target.value))} placeholder="0,00" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)] text-center font-bold" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setIsContributeOpen(false)} className="flex-1 py-2 rounded-[12px] text-xs font-bold bg-[var(--bg-app)] text-[var(--text-discreto)] hover:bg-[var(--bg-tertiary)]/50 transition-colors cursor-pointer">Cancelar</button>
              <button onClick={handleContribute} className="flex-1 py-2 rounded-[12px] text-xs font-bold bg-[#00cc52] text-white hover:opacity-90 transition-opacity cursor-pointer">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
