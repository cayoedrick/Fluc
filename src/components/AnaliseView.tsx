import React, { useState, useMemo } from 'react';
import { FlucState, Lancamento, Categoria, MetaFinanceira, MetaContribuicao } from '../types';
import { formatCurrency } from '../utils/currency';
import { Menu, TrendingUp, TrendingDown, Info, HelpCircle, PieChart as PieChartIcon, Target, Plus, CheckCircle2, AlertTriangle, ArrowRight, X, BrainCircuit, Sparkles, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { MetasView } from './MetasView';

interface AnaliseViewProps {
  lancamentos: Lancamento[];
  categorias: Categoria[];
  state: FlucState;
  setState: React.Dispatch<React.SetStateAction<FlucState>>;
  onOpenMenu?: () => void;
  onOpenSyncModal: () => void;
}

type PeriodType = 'este_mes' | 'mes_anterior' | 'ultimos_3_meses' | 'ultimos_6_meses' | 'este_ano' | 'personalizado';

export function AnaliseView({ lancamentos, categorias, state, setState, onOpenMenu, onOpenSyncModal }: AnaliseViewProps) {
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'metas'>('visao_geral');
  const [periodo, setPeriodo] = useState<PeriodType>('este_mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null);

  // IA Overview State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Helper functions for date filtering
  const today = new Date();
  
  const getPeriodDates = (p: PeriodType): { start: Date, end: Date } => {
    const start = new Date();
    const end = new Date();
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    switch (p) {
      case 'este_mes':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        start.setMonth(start.getMonth() - 1, 1);
        end.setDate(0);
        break;
      case 'ultimos_3_meses':
        start.setMonth(start.getMonth() - 2, 1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'ultimos_6_meses':
        start.setMonth(start.getMonth() - 5, 1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'este_ano':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      case 'personalizado':
        if (customStart) start.setTime(new Date(customStart + 'T00:00:00').getTime());
        if (customEnd) end.setTime(new Date(customEnd + 'T23:59:59').getTime());
        break;
    }
    return { start, end };
  };

  const getPreviousPeriodDates = (p: PeriodType, start: Date, end: Date): { start: Date, end: Date } => {
    const prevStart = new Date(start);
    const prevEnd = new Date(end);
    
    switch (p) {
      case 'este_mes':
        prevStart.setMonth(prevStart.getMonth() - 1, 1);
        prevEnd.setDate(0);
        break;
      case 'mes_anterior':
        prevStart.setMonth(prevStart.getMonth() - 1, 1);
        prevEnd.setDate(0);
        break;
      case 'ultimos_3_meses':
        prevStart.setMonth(prevStart.getMonth() - 3, 1);
        prevEnd.setDate(0);
        break;
      case 'ultimos_6_meses':
        prevStart.setMonth(prevStart.getMonth() - 6, 1);
        prevEnd.setDate(0);
        break;
      case 'este_ano':
        prevStart.setFullYear(prevStart.getFullYear() - 1, 0, 1);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1, 11, 31);
        break;
      case 'personalizado':
        const diff = end.getTime() - start.getTime();
        prevStart.setTime(start.getTime() - diff);
        prevEnd.setTime(end.getTime() - diff);
        break;
    }
    return { start: prevStart, end: prevEnd };
  };

  const { start: currentStart, end: currentEnd } = getPeriodDates(periodo);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodDates(periodo, currentStart, currentEnd);

  const getValidDate = (l: Lancamento) => {
    return l.tipo === 'despesa_cartao' && l.dataCompra ? l.dataCompra : l.data;
  };

  const isLancamentoInPeriod = (l: Lancamento, start: Date, end: Date) => {
    const d = new Date(getValidDate(l) + 'T12:00:00');
    return d >= start && d <= end;
  };

  // Memoized calculations
  const {
    currentLancamentos,
    prevLancamentos,
    totalDespesas,
    totalReceitas,
    prevTotalDespesas,
    gastosPorCategoria,
    evolucaoMensal
  } = useMemo(() => {
    const current = lancamentos.filter(l => isLancamentoInPeriod(l, currentStart, currentEnd));
    const prev = lancamentos.filter(l => isLancamentoInPeriod(l, prevStart, prevEnd));

    let despesas = 0;
    let receitas = 0;
    let pDespesas = 0;

    const catMap = new Map<string, { id: string, nome: string, valor: number, count: number }>();
    const evoMap = new Map<string, { sortKey: string, name: string, receitas: number, despesas: number }>();

    // Format for evolution chart based on period
    const isDaily = periodo === 'este_mes' || periodo === 'mes_anterior';
    const evoFormat = isDaily
      ? (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    current.forEach(l => {
      const isDespesa = l.tipo === 'despesa' || (l.tipo === 'despesa_cartao' && !l.estorno) || l.tipo === 'deposito_cofrinho';
      const isReceita = l.tipo === 'receita' || (l.tipo === 'despesa_cartao' && l.estorno) || l.tipo === 'retirada_cofrinho';
      
      // Ignore inner card payment receipts to avoid inflating revenues/expenses
      if (l.tipo === 'despesa_cartao' && l.descricao === 'Pagamento de Fatura Recibo') return;
      if (l.tipo === 'despesa' && l.faturaPagamentoId) return;

      const val = l.valor;
      const d = new Date(getValidDate(l) + 'T12:00:00');
      const sortKey = (periodo === "este_mes" || periodo === "mes_anterior") ? getValidDate(l) : getValidDate(l).substring(0, 7);

      if (!evoMap.has(sortKey)) {
        evoMap.set(sortKey, { sortKey, name: evoFormat(d), receitas: 0, despesas: 0 });
      }

      if (isDespesa) {
        despesas += val;
        evoMap.get(sortKey)!.despesas += val;

        const catId = l.categoriaId || 'sem_categoria';
        if (!catMap.has(catId)) {
          const catName = l.categoriaId 
            ? categorias.find(c => c.id === l.categoriaId)?.nome || 'Categoria excluída' 
            : 'Sem categoria';
          catMap.set(catId, { id: catId, nome: catName, valor: 0, count: 0 });
        }
        catMap.get(catId)!.valor += val;
        catMap.get(catId)!.count += 1;
      } else if (isReceita) {
        receitas += val;
        evoMap.get(sortKey)!.receitas += val;
      }
    });

    prev.forEach(l => {
      const isDespesa = l.tipo === 'despesa' || (l.tipo === 'despesa_cartao' && !l.estorno) || l.tipo === 'deposito_cofrinho';
      if (l.tipo === 'despesa_cartao' && l.descricao === 'Pagamento de Fatura Recibo') return;
      if (l.tipo === 'despesa' && l.faturaPagamentoId) return;

      if (isDespesa) pDespesas += l.valor;
    });

    const gastos = Array.from(catMap.values()).sort((a, b) => b.valor - a.valor);
    
    // Sort evolution by date using the underlying YYYY-MM-DD or YYYY-MM sortKey
    const evolucao = Array.from(evoMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return {
      currentLancamentos: current,
      prevLancamentos: prev,
      totalDespesas: despesas,
      totalReceitas: receitas,
      prevTotalDespesas: pDespesas,
      gastosPorCategoria: gastos,
      evolucaoMensal: evolucao
    };
  }, [lancamentos, categorias, currentStart, currentEnd, prevStart, prevEnd, periodo]);

  const saldo = totalReceitas - totalDespesas;
  const economizado = Math.max(0, saldo);
  
  let variacaoDespesas = 0;
  if (prevTotalDespesas > 0) {
    variacaoDespesas = ((totalDespesas - prevTotalDespesas) / prevTotalDespesas) * 100;
  }

  // Pre-generate standard colors for charts
  const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16'];

  // Análises e Oportunidades
  const analises = useMemo(() => {
    const list = [];
    if (variacaoDespesas > 0) {
      list.push({
        tipo: 'alerta',
        texto: `Suas despesas aumentaram ${variacaoDespesas.toFixed(1)}% em relação ao período anterior equivalente.`,
        sugestao: 'Revise seus gastos variáveis para identificar a origem do aumento.'
      });
    } else if (variacaoDespesas < 0) {
      list.push({
        tipo: 'sucesso',
        texto: `Você reduziu suas despesas em ${Math.abs(variacaoDespesas).toFixed(1)}% em comparação ao período anterior.`,
        sugestao: 'Ótimo trabalho! Considere investir a diferença.'
      });
    }

    if (gastosPorCategoria.length > 0) {
      const topCat = gastosPorCategoria[0];
      list.push({
        tipo: 'info',
        texto: `A categoria com maior gasto foi "${topCat.nome}" (${formatCurrency(topCat.valor)}).`,
        sugestao: `Uma redução de 10% nesta categoria economizaria aproximadamente ${formatCurrency(topCat.valor * 0.1)} neste período.`
      });

      if (gastosPorCategoria.length >= 3) {
        const top3Sum = gastosPorCategoria.slice(0, 3).reduce((sum, c) => sum + c.valor, 0);
        const perc = ((top3Sum / totalDespesas) * 100).toFixed(0);
        list.push({
          tipo: 'info',
          texto: `Três categorias representam ${perc}% de todas as suas despesas no período.`,
          sugestao: 'Focar na redução destes 3 grupos trará o maior impacto financeiro.'
        });
      }
    }

    if (saldo < 0) {
      list.push({
        tipo: 'alerta',
        texto: `Seu saldo ficou negativo em ${formatCurrency(Math.abs(saldo))}.`,
        sugestao: 'Atenção ao uso do limite de crédito ou cheque especial. Busque cobrir a diferença no próximo mês.'
      });
    } else if (saldo > 0) {
      list.push({
        tipo: 'sucesso',
        texto: `Você economizou ${formatCurrency(saldo)} neste período.`,
        sugestao: 'Construa ou reforce sua reserva de emergência com este valor.'
      });
    }

    return list;
  }, [variacaoDespesas, gastosPorCategoria, totalDespesas, saldo]);

  const getPeriodoLabel = (p: PeriodType) => {
    switch (p) {
      case 'este_mes': return 'Este mês';
      case 'mes_anterior': return 'Mês anterior';
      case 'ultimos_3_meses': return 'Últimos 3 meses';
      case 'ultimos_6_meses': return 'Últimos 6 meses';
      case 'este_ano': return 'Este ano';
      case 'personalizado': return 'Período personalizado';
      default: return 'Período selecionado';
    }
  };

  const fetchOverviewAIAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    setIsAiModalOpen(true);
    try {
      const topCategorias = gastosPorCategoria.slice(0, 5).map(c => ({
        nome: c.nome,
        valor: formatCurrency(c.valor),
        percentual: totalDespesas > 0 ? ((c.valor / totalDespesas) * 100).toFixed(1) : '0'
      }));

      const res = await fetch("/api/analyze-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodoLabel: getPeriodoLabel(periodo),
          totalReceitas: formatCurrency(totalReceitas),
          totalDespesas: formatCurrency(totalDespesas),
          saldo: formatCurrency(saldo),
          economizado: formatCurrency(economizado),
          variacaoDespesas,
          topCategorias,
          qtdLancamentos: currentLancamentos.length
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Erro HTTP ${res.status}: Não foi possível conectar ao backend.`);
      }

      const data = await res.json();
      setAiAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Erro inesperado ao consultar a IA");
    } finally {
      setAiLoading(false);
    }
  };

  // Selected Category Transactions
  const selectedCatTransactions = useMemo(() => {
    if (!selectedCategoriaId) return [];
    return currentLancamentos.filter(l => {
      const catId = l.categoriaId || 'sem_categoria';
      const isDespesa = l.tipo === 'despesa' || (l.tipo === 'despesa_cartao' && !l.estorno) || l.tipo === 'deposito_cofrinho';
      return isDespesa && catId === selectedCategoriaId;
    });
  }, [selectedCategoriaId, currentLancamentos]);

  return (
    <div className="w-full flex-1 flex flex-col space-y-6">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Análise Financeira</h2>
            <p className="text-xs text-[var(--text-discreto)] font-medium mt-0.5">Entenda e otimize seus gastos</p>
          </div>
        </div>
      </div>

      {/* 2. Top Tab Selector (Visão Geral vs Metas) */}
      <div className="flex bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-1.5 rounded-[18px] text-sm font-semibold max-w-sm">
        <button
          onClick={() => setActiveTab('visao_geral')}
          className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'visao_geral'
              ? 'bg-[var(--bg-secondary)] text-white border border-[var(--bg-secondary)]'
              : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
          }`}
        >
          <PieChartIcon size={16} />
          <span>Visão Geral</span>
        </button>
        <button
          onClick={() => setActiveTab('metas')}
          className={`flex-1 py-2.5 px-4 rounded-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'metas'
              ? 'bg-[var(--bg-secondary)] text-white border border-[var(--bg-secondary)]'
              : 'text-[var(--text-discreto)] hover:text-[var(--text-general)]'
          }`}
        >
          <Target size={16} />
          <span>Metas</span>
        </button>
      </div>

      {activeTab === 'metas' ? (
        <MetasView 
          state={state}
          setState={setState}
          currentDate={periodo === 'este_mes' ? new Date().toISOString().split('T')[0].substring(0,7) : null}
        />
      ) : (
        <>
          {/* Filters and AI Action */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
              {[
                { id: 'este_mes', label: 'Este mês' },
                { id: 'mes_anterior', label: 'Mês anterior' },
                { id: 'ultimos_3_meses', label: 'Últimos 3 meses' },
                { id: 'ultimos_6_meses', label: 'Últimos 6 meses' },
                { id: 'este_ano', label: 'Este ano' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id as PeriodType)}
                  className={`px-3.5 py-2 tag-flat border transition-colors shrink-0 flex items-center gap-1.5 ${
                    periodo === p.id 
                      ? 'bg-[var(--bg-secondary)] text-white font-bold border-[var(--bg-secondary)]' 
                      : 'bg-[var(--bg-primary)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchOverviewAIAnalysis}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[14px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
              title="Gerar diagnóstico inteligente com Gemini"
            >
              <BrainCircuit size={16} />
              <span>Análise com IA</span>
            </button>
          </div>

          {periodo === 'personalizado' && (
            <div className="flex gap-4 items-center bg-[var(--bg-app)] p-3 rounded-2xl border border-[var(--bg-tertiary)]">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Data Inicial</label>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-[var(--bg-primary)] text-[var(--text-general)] text-xs font-bold rounded-xl px-3 py-2 outline-none border border-[var(--bg-tertiary)] focus:border-[var(--bg-secondary)]"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Data Final</label>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-[var(--bg-primary)] text-[var(--text-general)] text-xs font-bold rounded-xl px-3 py-2 outline-none border border-[var(--bg-tertiary)] focus:border-[var(--bg-secondary)]"
                />
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] font-extrabold tracking-wider text-[var(--text-discreto)] uppercase block mb-1">Receitas</span>
              <span className="text-xl font-bold text-[#00cc52]">R$ {formatCurrency(totalReceitas)}</span>
            </div>
            <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] font-extrabold tracking-wider text-[var(--text-discreto)] uppercase block mb-1">Despesas</span>
              <span className="text-xl font-bold text-[#ed793a]">R$ {formatCurrency(totalDespesas)}</span>
            </div>
            <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] font-extrabold tracking-wider text-[var(--text-discreto)] uppercase block mb-1">Saldo do Período</span>
              <span className={`text-xl font-bold ${saldo >= 0 ? 'text-[#00cc52]' : 'text-red-500'}`}>R$ {formatCurrency(saldo)}</span>
            </div>
            <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-5 relative overflow-hidden">
              <span className="text-[10px] font-extrabold tracking-wider text-[var(--text-discreto)] uppercase block mb-1">Valor Economizado</span>
              <span className="text-xl font-bold text-[var(--text-general)]">R$ {formatCurrency(economizado)}</span>
            </div>
          </div>

          {currentLancamentos.length === 0 ? (
            <div className="bg-[var(--bg-app)] rounded-3xl border border-[var(--bg-tertiary)] p-12 flex flex-col items-center justify-center text-center">
              <Info size={40} className="text-[var(--text-discreto)] mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-general)]">Nenhum dado encontrado</h3>
              <p className="text-sm text-[var(--text-discreto)] mt-2 max-w-sm">
                Não existem dados suficientes neste período. Registre receitas e despesas para visualizar sua análise financeira.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gastos por categoria */}
                <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-[var(--text-general)] mb-6 flex items-center gap-2">
                    <PieChartIcon className="stroke-[2.5] text-[var(--text-discreto)]" size={18} />
                    Gastos por Categoria
                  </h3>
                  
                  {totalDespesas === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-sm text-[var(--text-discreto)] font-medium">
                      Nenhuma despesa registrada neste período.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-8 w-full">
                      <div className="w-[240px] h-[240px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={gastosPorCategoria}
                              cx="50%"
                              cy="50%"
                              innerRadius={75}
                              outerRadius={105}
                              paddingAngle={5}
                              dataKey="valor"
                              stroke="none"
                            >
                              {gastosPorCategoria.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => `R$ ${formatCurrency(value)}`}
                              contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '12px', color: 'var(--text-general)', fontWeight: 'bold' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="w-full space-y-3">
                        {gastosPorCategoria.slice(0, 5).map((cat, idx) => (
                          <div 
                            key={cat.id} 
                            onClick={() => setSelectedCategoriaId(selectedCategoriaId === cat.id ? null : cat.id)}
                            className={`flex items-center justify-between text-xs p-2 rounded-xl cursor-pointer transition-colors ${selectedCategoriaId === cat.id ? 'bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]/50 border border-transparent'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="font-bold text-[var(--text-general)] truncate max-w-[120px]">{cat.nome}</span>
                              <span className="text-[10px] text-[var(--text-discreto)]">({cat.count})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-[var(--text-general)]">R$ {formatCurrency(cat.valor)}</span>
                              <span className="text-[10px] font-extrabold text-[var(--text-discreto)] w-8 text-right">
                                {((cat.valor / totalDespesas) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions for selected category */}
                  {selectedCategoriaId && (
                    <div className="mt-6 pt-6 border-t border-[var(--bg-tertiary)]">
                      <h4 className="text-xs font-bold text-[var(--text-general)] mb-4">Lançamentos da categoria</h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {selectedCatTransactions.map(t => (
                          <div key={t.id} className="flex justify-between items-center text-xs p-2.5 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-xl">
                            <span className="font-medium text-[var(--text-general)] truncate flex-1">{t.descricao}</span>
                            <span className="text-[10px] text-[var(--text-discreto)] mx-3">{t.data.split('-').reverse().join('/')}</span>
                            <span className="font-bold text-[#ed793a]">R$ {formatCurrency(t.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Análises e Oportunidades */}
                <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-[var(--text-general)] flex items-center gap-2">
                      <HelpCircle className="stroke-[2.5] text-[var(--text-discreto)]" size={18} />
                      Análises e Oportunidades
                    </h3>
                    <button
                      onClick={fetchOverviewAIAnalysis}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-indigo-500/20"
                    >
                      <BrainCircuit size={14} />
                      <span>Diagnóstico IA</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {analises.map((an, idx) => (
                      <div key={idx} className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-4 rounded-2xl flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          {an.tipo === 'sucesso' && <TrendingDown size={16} className="text-[#00cc52]" />}
                          {an.tipo === 'alerta' && <TrendingUp size={16} className="text-red-500" />}
                          {an.tipo === 'info' && <Info size={16} className="text-indigo-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-general)] mb-1">{an.texto}</p>
                          <p className="text-xs font-medium text-[var(--text-discreto)] leading-relaxed">{an.sugestao}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {gastosPorCategoria.length > 0 && (
                    <div className="mt-6 p-4 border border-[var(--bg-tertiary)] rounded-2xl bg-indigo-500/5">
                      <p className="text-[10px] font-extrabold uppercase text-indigo-500 mb-2">Simulação Rápida</p>
                      <p className="text-xs font-medium text-[var(--text-general)] mb-3">
                        Se você reduzir seus gastos com <strong>{gastosPorCategoria[0].nome}</strong> em:
                      </p>
                      <div className="flex gap-2">
                        {[5, 10, 20].map(perc => (
                          <div key={perc} className="flex-1 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-xl p-2 text-center">
                            <span className="block text-[10px] font-bold text-[var(--text-discreto)] mb-1">-{perc}%</span>
                            <span className="block text-xs font-extrabold text-[#00cc52]">R$ {formatCurrency(gastosPorCategoria[0].valor * (perc / 100))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Evolução Financeira */}
              <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-3xl p-6">
                <h3 className="text-sm font-bold text-[var(--text-general)] mb-6 flex items-center gap-2">
                  <TrendingUp className="stroke-[2.5] text-[var(--text-discreto)]" size={18} />
                  Evolução Financeira
                </h3>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolucaoMensal} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bg-tertiary)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: 'var(--text-discreto)', fontWeight: 'bold' }} 
                        dy={10}
                      />
                      <YAxis 
                        hide 
                      />
                      <Tooltip 
                        formatter={(value: number) => `R$ ${formatCurrency(value)}`}
                        cursor={{ fill: 'var(--bg-secondary)', opacity: 0.5 }}
                        contentStyle={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--bg-tertiary)', borderRadius: '12px', color: 'var(--text-general)', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="receitas" name="Receitas" fill="#00cc52" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="despesas" name="Despesas" fill="#ed793a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal Análise Inteligente com IA na Visão Geral */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--bg-tertiary)]">
              <div className="flex items-center gap-2.5 text-indigo-500 font-bold">
                <BrainCircuit size={22} />
                <div className="flex flex-col">
                  <h3 className="text-base text-[var(--text-general)] leading-tight">Diagnóstico Inteligente</h3>
                  <span className="text-[11px] text-[var(--text-discreto)] font-medium">Gemini 3.6 Flash • {getPeriodoLabel(periodo)}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsAiModalOpen(false)} 
                className="text-[var(--text-discreto)] hover:text-[var(--text-general)] p-1 rounded-lg hover:bg-[var(--bg-tertiary)]/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-[var(--text-general)]">Processando dados do período...</p>
                <p className="text-xs text-[var(--text-discreto)]">O Gemini está analisando receitas, despesas e hábitos de consumo.</p>
              </div>
            ) : aiError ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle size={18} />
                  <span>Análise indisponível</span>
                </div>
                <p className="text-xs leading-relaxed">{aiError}</p>
                <p className="text-[11px] text-[var(--text-discreto)] pt-1 border-t border-red-500/20">
                  Certifique-se de que a variável <strong>GEMINI_API_KEY</strong> está definida nas configurações do projeto.
                </p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-2">
                {/* Resumo e Saúde Financeira */}
                <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">Resumo Executivo</span>
                    {aiAnalysis.saudeFinanceira && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {aiAnalysis.saudeFinanceira}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--text-general)] leading-relaxed">{aiAnalysis.resumoGeral}</p>
                </div>

                {/* Pontos Fortes e Pontos de Atenção em Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Pontos Fortes */}
                  {aiAnalysis.pontosFortes && aiAnalysis.pontosFortes.length > 0 && (
                    <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-3.5 rounded-2xl">
                      <h4 className="text-xs font-bold text-[#00cc52] uppercase mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        Pontos Fortes
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[var(--text-general)]">
                        {aiAnalysis.pontosFortes.map((p: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-[#00cc52] font-bold shrink-0">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pontos de Atenção */}
                  {aiAnalysis.pontosAtencao && aiAnalysis.pontosAtencao.length > 0 && (
                    <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-3.5 rounded-2xl">
                      <h4 className="text-xs font-bold text-[#ed793a] uppercase mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        Pontos de Atenção
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[var(--text-general)]">
                        {aiAnalysis.pontosAtencao.map((p: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-[#ed793a] font-bold shrink-0">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recomendações e Ações Práticas */}
                {aiAnalysis.recomendacoes && aiAnalysis.recomendacoes.length > 0 && (
                  <div className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] p-4 rounded-2xl">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2.5 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Ações Recomendadas
                    </h4>
                    <ol className="space-y-2 text-xs text-[var(--text-general)] list-decimal pl-4 leading-relaxed">
                      {aiAnalysis.recomendacoes.map((rec: string, idx: number) => (
                        <li key={idx} className="pl-1">{rec}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Mensagem Final */}
                {aiAnalysis.mensagemFinal && (
                  <div className="text-center italic text-xs font-medium text-[var(--text-discreto)] pt-2 border-t border-[var(--bg-tertiary)] px-2">
                    "{aiAnalysis.mensagemFinal}"
                  </div>
                )}
              </div>
            ) : null}
            
            {!aiLoading && (
              <div className="flex gap-2 pt-2 border-t border-[var(--bg-tertiary)]">
                {aiAnalysis && (
                  <button 
                    onClick={fetchOverviewAIAnalysis} 
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-[12px] text-xs font-bold bg-[var(--bg-app)] text-[var(--text-general)] border border-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <RefreshCw size={14} />
                    Recalcular
                  </button>
                )}
                <button 
                  onClick={() => setIsAiModalOpen(false)} 
                  className="flex-1 py-2.5 rounded-[12px] text-xs font-bold bg-[var(--bg-secondary)] text-white hover:opacity-90 transition-opacity"
                >
                  Fechar Diagnóstico
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
