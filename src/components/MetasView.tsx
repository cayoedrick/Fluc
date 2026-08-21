import React, { useState, useMemo } from 'react';
import { FlucState, MetaFinanceira, MetaContribuicao, Categoria } from '../types';
import { formatCurrency, formatCurrencyInput } from '../utils/currency';
import { Plus, Target, CheckCircle2, AlertTriangle, ArrowRight, X, TrendingUp, TrendingDown, Info, Shield } from 'lucide-react';

interface MetasViewProps {
  state: FlucState;
  setState: React.Dispatch<React.SetStateAction<FlucState>>;
  currentDate: string | null;
}

export function MetasView({ state, setState, currentDate }: MetasViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedMetaId, setSelectedMetaId] = useState<string | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [valorDesejado, setValorDesejado] = useState('');
  const [valorAcumulado, setValorAcumulado] = useState('');
  const [dataDesejada, setDataDesejada] = useState('');
  const [prioridade, setPrioridade] = useState<'baixa'|'media'|'alta'>('media');
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

  const handleCreate = () => {
    const valD = parseFloat(valorDesejado.replace(/\./g, '').replace(',', '.'));
    const valA = parseFloat(valorAcumulado.replace(/\./g, '').replace(',', '.')) || 0;
    const valM = parseFloat(maxMensal.replace(/\./g, '').replace(',', '.')) || 0;
    
    const novaMeta: MetaFinanceira = {
      id: `meta-${Date.now()}`,
      nome,
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

  const resetForm = () => {
    setCreateStep(1);
    setNome('');
    setTipo('');
    setValorDesejado('');
    setValorAcumulado('');
    setDataDesejada('');
    setPrioridade('media');
    setMaxMensal('');
    setCategoriasProtegidas([]);
  };

  const handleContribute = () => {
    if (!selectedMetaId) return;
    const val = parseFloat(contributeValue.replace(/\./g, '').replace(',', '.'));
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

  const renderCreateModal = () => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-[var(--bg-tertiary)] flex justify-between items-center bg-[var(--bg-app)]">
            <h3 className="font-bold text-[var(--text-general)]">Criar Nova Meta</h3>
            <button onClick={() => setIsCreateOpen(false)} className="p-2 text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-full hover:bg-[var(--bg-tertiary)]/50 transition-colors">
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
                <p className="text-sm font-semibold text-[var(--text-general)]">Etapa 2 — Situação Atual</p>
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
                <p className="text-sm font-semibold text-[var(--text-general)]">Etapa 3 — Preferências (Opcional)</p>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR MÁXIMO MENSAL (R$)</label>
                  <input type="text" inputMode="decimal" value={maxMensal} onChange={e => setMaxMensal(formatCurrencyInput(e.target.value))} placeholder="Deixe em branco para calcular automaticamente" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-discreto)] block mb-2">CATEGORIAS PROTEGIDAS (Não reduzir)</label>
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
          
          <div className="p-4 border-t border-[var(--bg-tertiary)] bg-[var(--bg-app)] flex justify-between">
            {createStep > 1 ? (
              <button onClick={() => setCreateStep(createStep - 1)} className="px-4 py-2 rounded-[12px] text-sm font-bold text-[var(--text-discreto)] hover:bg-[var(--bg-primary)] transition-colors">Voltar</button>
            ) : <div></div>}
            
            {createStep < 3 ? (
              <button disabled={!nome || !valorDesejado} onClick={() => setCreateStep(createStep + 1)} className="px-6 py-2 rounded-[12px] text-sm font-bold bg-[var(--bg-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50">Próximo</button>
            ) : (
              <button onClick={handleCreate} className="px-6 py-2 rounded-[12px] text-sm font-bold bg-[#00cc52] text-white hover:opacity-90 transition-opacity">Criar Plano</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMetaDetails = (meta: MetaFinanceira) => {
    const restante = Math.max(0, meta.valorDesejado - meta.valorAcumulado);
    const pct = Math.min(100, (meta.valorAcumulado / meta.valorDesejado) * 100);
    
    // Calculate months available
    const startDate = new Date();
    const endDate = new Date(meta.dataDesejada);
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    if (months <= 0) months = 1;
    
    const requiredMonthly = restante / months;
    
    let viability = 'viavel';
    if (requiredMonthly > averages.saldo) {
      viability = requiredMonthly > averages.saldo * 1.5 ? 'dificil' : 'ajustes';
    }

    // Get suggestions for categories
    const savingsCat = state.categorias
      .filter(c => c.tipo === 'despesa' && !meta.categoriasProtegidas.includes(c.id))
      .map(c => {
        let catGastos = 0;
        let count = 0;
        for (let i = 0; i < 3; i++) {
          const d = new Date(startDate.getFullYear(), startDate.getMonth() - i, 1);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const prefix = `${d.getFullYear()}-${mm}`;
          catGastos += state.lancamentos.filter(l => l.categoriaId === c.id && l.data.startsWith(prefix)).reduce((acc, l) => acc + l.valor, 0);
          count++;
        }
        return { nome: c.nome, id: c.id, avg: catGastos / count };
      })
      .sort((a,b) => b.avg - a.avg);

    return (
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-3xl p-6 relative">
        <button onClick={() => setSelectedMetaId(null)} className="absolute top-4 right-4 p-2 text-[var(--text-discreto)] hover:text-[var(--text-general)] bg-[var(--bg-app)] rounded-full transition-colors"><X size={16}/></button>
        <h3 className="text-xl font-bold text-[var(--text-general)] mb-1">{meta.nome}</h3>
        <p className="text-xs text-[var(--text-discreto)] mb-6 flex items-center gap-2">
          {viability === 'viavel' && <CheckCircle2 size={14} className="text-[#00cc52]" />}
          {viability === 'ajustes' && <AlertTriangle size={14} className="text-[#f59e0b]" />}
          {viability === 'dificil' && <AlertTriangle size={14} className="text-red-500" />}
          Situação: {viability === 'viavel' ? 'Viável' : viability === 'ajustes' ? 'Exige ajustes' : 'Prazo difícil'}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Acumulado</p>
            <p className="text-lg font-extrabold text-[#00cc52]">R$ {formatCurrency(meta.valorAcumulado)}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Faltam</p>
            <p className="text-lg font-extrabold text-[var(--text-general)]">R$ {formatCurrency(restante)}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Necessário (mês)</p>
            <p className="text-lg font-extrabold text-[#1c7ae4]">R$ {formatCurrency(requiredMonthly)}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--bg-tertiary)]">
            <p className="text-[10px] font-bold text-[var(--text-discreto)] uppercase mb-1">Saldo Médio</p>
            <p className="text-lg font-extrabold text-[var(--text-general)]">R$ {formatCurrency(averages.saldo)}</p>
          </div>
        </div>

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
          <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--bg-tertiary)]">
            <h4 className="text-sm font-bold text-[var(--text-general)] mb-4 flex items-center gap-2">
              <Target size={16} className="text-[#1c7ae4]" /> Plano Recomendado
            </h4>
            <ol className="space-y-4 text-xs text-[var(--text-general)]">
              <li className="flex gap-2">
                <span className="font-bold text-[#1c7ae4]">1.</span> 
                <span>Reservar <strong className="text-[var(--text-general)]">R$ {formatCurrency(requiredMonthly)}</strong> mensalmente.</span>
              </li>
              {viability !== 'viavel' && savingsCat[0] && savingsCat[0].avg > 0 && (
                <li className="flex gap-2">
                  <span className="font-bold text-[#1c7ae4]">2.</span> 
                  <span>Reduzir 10% (R$ {formatCurrency(savingsCat[0].avg * 0.1)}) em {savingsCat[0].nome}.</span>
                </li>
              )}
              {viability !== 'viavel' && savingsCat[1] && savingsCat[1].avg > 0 && (
                <li className="flex gap-2">
                  <span className="font-bold text-[#1c7ae4]">3.</span> 
                  <span>Reduzir 5% (R$ {formatCurrency(savingsCat[1].avg * 0.05)}) em {savingsCat[1].nome}.</span>
                </li>
              )}
              <li className="flex gap-2">
                <span className="font-bold text-[#1c7ae4]">{viability === 'viavel' ? '2.' : '4.'}</span> 
                <span>Manter o ritmo de economia até {meta.dataDesejada.split('-').reverse().join('/')}.</span>
              </li>
            </ol>
            
            <div className="mt-6 flex gap-2">
              <button onClick={() => setIsContributeOpen(true)} className="w-full bg-[#1c7ae4] text-white text-xs font-bold py-2 rounded-xl hover:opacity-90 transition-opacity">
                Adicionar Valor
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--bg-tertiary)] flex flex-col">
             <h4 className="text-sm font-bold text-[var(--text-general)] mb-4 flex items-center gap-2">
              <Info size={16} className="text-[#f59e0b]" /> Sugestões de Economia
            </h4>
            <div className="flex-1 space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
              {savingsCat.slice(0,4).map(c => c.avg > 0 ? (
                <div key={c.id} className="flex justify-between items-center bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--bg-tertiary)]">
                  <span className="text-xs font-semibold text-[var(--text-general)]">{c.nome}</span>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <span className="bg-[#f59e0b]/10 text-[#f59e0b] px-2 py-0.5 rounded-md">-5%: R$ {formatCurrency(c.avg*0.05)}</span>
                    <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md">-10%: R$ {formatCurrency(c.avg*0.1)}</span>
                  </div>
                </div>
              ) : null)}
            </div>
            
            <button onClick={() => deleteMeta(meta.id)} className="mt-4 text-[10px] font-bold text-red-500 hover:underline self-end">Excluir meta</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
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
            className="bg-[var(--bg-secondary)] text-white px-6 py-3 rounded-[14px] font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
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
              {state.metas.map(meta => {
                const pct = Math.min(100, (meta.valorAcumulado / meta.valorDesejado) * 100);
                return (
                  <div key={meta.id} onClick={() => setSelectedMetaId(meta.id)} className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-2xl cursor-pointer hover:border-[var(--bg-secondary)] transition-colors">
                    <h4 className="font-bold text-[var(--text-general)] text-sm mb-1">{meta.nome}</h4>
                    <p className="text-xs text-[var(--text-discreto)] mb-4 flex justify-between">
                      <span>R$ {formatCurrency(meta.valorAcumulado)} de R$ {formatCurrency(meta.valorDesejado)}</span>
                      <span className="font-bold text-[#00cc52]">{pct.toFixed(0)}%</span>
                    </p>
                    <div className="h-2 bg-[var(--bg-app)] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00cc52]" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
              <div onClick={() => setIsCreateOpen(true)} className="bg-[var(--bg-app)] border border-[var(--bg-tertiary)] border-dashed p-5 rounded-2xl cursor-pointer hover:bg-[var(--bg-primary)] transition-colors flex flex-col items-center justify-center min-h-[120px] text-[var(--text-discreto)] hover:text-[var(--text-general)]">
                <Plus size={24} className="mb-2" />
                <span className="text-xs font-bold">Nova Meta</span>
              </div>
            </div>
          )}
        </div>
      )}

      {isCreateOpen && renderCreateModal()}

      {isContributeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col p-6 space-y-4">
            <h3 className="font-bold text-[var(--text-general)] text-center">Adicionar Valor</h3>
            <p className="text-xs text-[var(--text-discreto)] text-center">Quanto você deseja adicionar à sua meta agora?</p>
            <input type="text" inputMode="decimal" value={contributeValue} onChange={e => setContributeValue(formatCurrencyInput(e.target.value))} placeholder="0,00" className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-sm text-[var(--text-general)] focus:outline-none focus:border-[var(--bg-secondary)] text-center font-bold" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setIsContributeOpen(false)} className="flex-1 py-2 rounded-[12px] text-xs font-bold bg-[var(--bg-app)] text-[var(--text-discreto)] hover:bg-[var(--bg-tertiary)]/50 transition-colors">Cancelar</button>
              <button onClick={handleContribute} className="flex-1 py-2 rounded-[12px] text-xs font-bold bg-[#00cc52] text-white hover:opacity-90 transition-opacity">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
