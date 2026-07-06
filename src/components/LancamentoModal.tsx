import React, { useState } from 'react';
import { Conta, Cartao, Categoria, Lancamento, ParticipanteDespesa } from '../types';
import { Plus, X, Calendar, Check, ArrowRight, Wallet, CreditCard, Info, Share2, Users, Percent, Trash2 } from 'lucide-react';
import { FloatingInfoModal } from './FloatingInfoModal';

interface LancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  onAddLancamento: (l: Omit<Lancamento, 'id'>) => void;
  isTutorialActive?: boolean;
}

type LancamentoType = 'receita' | 'despesa' | 'despesa_cartao' | 'transferencia';

export function LancamentoModal({
  isOpen,
  onClose,
  contas,
  cartoes,
  categorias,
  onAddLancamento,
  isTutorialActive = false
}: LancamentoModalProps) {
  const [tipo, setTipo] = useState<LancamentoType>('receita');
  const [valor, setValor] = useState<string>('');
  
  // Fields
  const [recebidoPagoEfetivado, setRecebidoPagoEfetivado] = useState<boolean>(true);
  const [estorno, setEstorno] = useState<boolean>(false);
  const [dataSelection, setDataSelection] = useState<'hoje' | 'ontem' | 'personalizado'>('hoje');
  const [customData, setCustomData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [contaId, setContaId] = useState<string>('');
  const [paraContaId, setParaContaId] = useState<string>('');
  const [cartaoId, setCartaoId] = useState<string>('');
  
  // Shared Expense
  const [isShared, setIsShared] = useState<boolean>(false);
  const [participantes, setParticipantes] = useState<ParticipanteDespesa[]>([]);
  
  // Recurrence / Installments
  const [fixoRecorrente, setFixoRecorrente] = useState<boolean>(false);
  const [parcelado, setParcelado] = useState<boolean>(false);
  const [numParcelas, setNumParcelas] = useState<number | string>('');
  const [valorEhPorParcela, setValorEhPorParcela] = useState<boolean>(false);
  const [showValorParcelaInfo, setShowValorParcelaInfo] = useState<boolean>(false);

  // Categories filtered by type
  const isIncome = tipo === 'receita';
  const filteredCategorias = categorias.filter(c => c.tipo === (isIncome ? 'receita' : 'despesa'));

  // Default selections when modal type shifts
  const handleTipoChange = (newTipo: LancamentoType) => {
    setTipo(newTipo);
    // Reset secondary flags to logical defaults
    setRecebidoPagoEfetivado(true);
    setEstorno(false);
    setFixoRecorrente(false);
    setParcelado(false);

    // Auto select first category of correct type
    const cats = categorias.filter(c => c.tipo === (newTipo === 'receita' ? 'receita' : 'despesa'));
    if (cats.length > 0) {
      setCategoriaId(cats[0].id);
    } else {
      setCategoriaId('');
    }

    if (newTipo === 'despesa_cartao' && cartoes.length > 0) {
      setCartaoId(cartoes[0].id);
    } else if (contas.length > 0) {
      setContaId(contas[0].id);
      if (contas.length > 1) {
        setParaContaId(contas[1].id);
      } else {
        setParaContaId(contas[0].id);
      }
    }

    if (newTipo === 'receita' || newTipo === 'transferencia') {
      setIsShared(false);
      setParticipantes([]);
    }
  };

  // Set default accounts & categories on opening
  React.useEffect(() => {
    if (isOpen) {
      // Set initial state based on active tipo
      const cats = categorias.filter(c => c.tipo === (tipo === 'receita' ? 'receita' : 'despesa'));
      if (cats.length > 0 && !categoriaId) {
        setCategoriaId(cats[0].id);
      }
      if (contas.length > 0 && !contaId) {
        setContaId(contas[0].id);
        if (contas.length > 1) {
          setParaContaId(contas[1].id);
        }
      }
      if (cartoes.length > 0 && !cartaoId) {
        setCartaoId(cartoes[0].id);
      }
    }
  }, [isOpen, tipo, contas, cartoes, categorias]);

  const getFinalDate = () => {
    const today = new Date();
    if (dataSelection === 'hoje') {
      return today.toISOString().split('T')[0];
    } else if (dataSelection === 'ontem') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    return customData;
  };

  const handleConfirm = () => {
    const parsedValor = parseFloat(valor.replace(',', '.'));
    if (isNaN(parsedValor) || parsedValor <= 0) {
      alert('Por favor, digite um valor válido.');
      return;
    }

    if (!descricao.trim()) {
      alert('Por favor, insira uma descrição.');
      return;
    }

    if ((tipo === 'receita' || tipo === 'despesa') && !contaId) {
      alert('Por favor, selecione uma conta.');
      return;
    }
    
    if (tipo === 'despesa_cartao' && !cartaoId) {
      alert('Por favor, selecione um cartão.');
      return;
    }

    if (isShared && participantes.length === 0) {
      alert('Por favor, adicione ao menos um participante para a despesa compartilhada.');
      return;
    }

    const payload: Omit<Lancamento, 'id'> = {
      tipo,
      valor: parsedValor,
      recebidoPagoEfetivado,
      data: getFinalDate(),
      descricao: descricao.trim(),
      isShared,
      participantes: isShared ? participantes : undefined
    };

    if (tipo === 'receita') {
      payload.categoriaId = categoriaId;
      payload.contaId = contaId;
      payload.fixoRecorrente = fixoRecorrente;
      payload.parcelado = parcelado;
      if (parcelado) {
        const p = typeof numParcelas === 'string' ? parseInt(numParcelas) : numParcelas;
        if (isNaN(p) || p < 2) {
          alert('Por favor, insira um número de parcelas válido (mínimo 2).');
          return;
        }
        payload.numParcelas = p;
        payload.isValorParcela = valorEhPorParcela;
      }
    } else if (tipo === 'despesa') {
      payload.categoriaId = categoriaId;
      payload.contaId = contaId;
      payload.fixoRecorrente = fixoRecorrente;
      payload.parcelado = parcelado;
      if (parcelado) {
        const p = typeof numParcelas === 'string' ? parseInt(numParcelas) : numParcelas;
        if (isNaN(p) || p < 2) {
          alert('Por favor, insira um número de parcelas válido (mínimo 2).');
          return;
        }
        payload.numParcelas = p;
        payload.isValorParcela = valorEhPorParcela;
      }
    } else if (tipo === 'despesa_cartao') {
      payload.cartaoId = cartaoId;
      payload.categoriaId = categoriaId;
      payload.estorno = estorno;
      payload.parcelado = parcelado;
      if (parcelado) {
        const p = typeof numParcelas === 'string' ? parseInt(numParcelas) : numParcelas;
        if (isNaN(p) || p < 2) {
          alert('Por favor, insira um número de parcelas válido (mínimo 2).');
          return;
        }
        payload.numParcelas = p;
        payload.isValorParcela = valorEhPorParcela;
      }
      // despesa_cartao doesn't use the standard received flag but we default it to true
      payload.recebidoPagoEfetivado = true;
    } else if (tipo === 'transferencia') {
      payload.contaId = contaId; // "da conta"
      payload.paraContaId = paraContaId; // "para conta"
      if (contaId === paraContaId) {
        alert('As contas de origem e destino devem ser diferentes.');
        return;
      }
    }

    onAddLancamento(payload);
    
    // Reset fields
    setValor('');
    setDescricao('');
    setIsShared(false);
    setParticipantes([]);
    onClose();
  };

  const addParticipante = () => {
    setParticipantes([...participantes, { nome: '', valor: 0, isPorcentagem: false }]);
  };

  const updateParticipante = (index: number, fields: Partial<ParticipanteDespesa>) => {
    const updated = [...participantes];
    updated[index] = { ...updated[index], ...fields };
    setParticipantes(updated);
  };

  const removeParticipante = (index: number) => {
    setParticipantes(participantes.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isTutorialActive ? 'bg-transparent backdrop-blur-none pointer-events-none' : 'bg-black/60 backdrop-blur-xs'
    }`}>
      <div className="w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col focus:outline-hidden pointer-events-auto shadow-2xl">
        
        {/* Header Tabs */}
        <div id="modal-type-tabs" className="flex bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] p-1.5 text-sm font-medium gap-1.5">
          {(['receita', 'despesa', 'despesa_cartao', 'transferencia'] as LancamentoType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTipoChange(t)}
              className={`flex-1 py-2.5 px-1 text-center rounded-[12px] transition-all duration-200 border text-xs sm:text-sm ${
                tipo === t
                  ? t === 'receita'
                    ? 'bg-[#00cc52] text-white font-bold border-[#00cc52] shadow-sm'
                    : t === 'despesa'
                    ? 'bg-[#d03c4d] text-white font-bold border-[#d03c4d] shadow-sm'
                    : t === 'despesa_cartao'
                    ? 'bg-[#ed793a] text-white font-bold border-[#ed793a] shadow-sm'
                    : 'bg-[#1c7ae4] text-white font-bold border-[#1c7ae4] shadow-sm'
                  : 'text-[var(--text-discreto)] hover:text-[var(--text-general)] hover:bg-[var(--bg-primary)]/40 border-transparent bg-transparent'
              }`}
            >
              {t === 'receita' && 'Receita'}
              {t === 'despesa' && 'Despesa'}
              {t === 'despesa_cartao' && 'Cartão'}
              {t === 'transferencia' && 'Transf.'}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Top Row: Value and Toggle Switch */}
          <div className="flex items-center justify-between gap-4">
            {/* Value input (Left) */}
            <div className="flex-1">
              <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">VALOR (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full text-3xl font-bold bg-transparent text-[var(--text-general)] focus:outline-hidden border-b border-dashed border-[var(--bg-secondary)] pb-1"
                id="modal-value-input"
              />
            </div>

            {/* Toggle Switch (Right) */}
            <div className="text-right">
              {tipo === 'receita' && (
                <>
                  <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">RECEBIDO</span>
                  <button
                    onClick={() => setRecebidoPagoEfetivado(!recebidaStatus())}
                    className={`toggle-switch rounded-full transition-colors ${
                      recebidoPagoEfetivado ? 'bg-[#00cc52]' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                        recebidoPagoEfetivado ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </>
              )}

              {tipo === 'despesa' && (
                <>
                  <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">PAGO</span>
                  <button
                    onClick={() => setRecebidoPagoEfetivado(!recebidaStatus())}
                    className={`toggle-switch rounded-full transition-colors ${
                      recebidoPagoEfetivado ? 'bg-[#d03c4d]' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                        recebidoPagoEfetivado ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </>
              )}

              {tipo === 'despesa_cartao' && (
                <>
                  <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">ESTORNO / AJUSTE</span>
                  <button
                    onClick={() => setEstorno(!estorno)}
                    className={`toggle-switch rounded-full transition-colors ${
                      estorno ? 'bg-[#ed793a]' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                        estorno ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </>
              )}

              {tipo === 'transferencia' && (
                <>
                  <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">EFETIVADO</span>
                  <button
                    onClick={() => setRecebidoPagoEfetivado(!recebidoPagoEfetivado)}
                    className={`toggle-switch rounded-full transition-colors ${
                      recebidoPagoEfetivado ? 'bg-[#1c7ae4]' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                        recebidoPagoEfetivado ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Shared Expense Toggle */}
          {(tipo === 'despesa' || tipo === 'despesa_cartao') && (
            <div className="border-t border-b border-[var(--bg-tertiary)] py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-indigo-500" />
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-general)] block">Despesa Compartilhada</span>
                    <span className="text-xs text-[var(--text-discreto)]">Dividir esta despesa com outras pessoas</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShared(!isShared)}
                  className={`toggle-switch rounded-full transition-colors ${
                    isShared ? 'bg-indigo-500' : 'bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                      isShared ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isShared && (
                <div className="space-y-3 pt-2">
                  {participantes.map((p, idx) => (
                    <div key={idx} className="bg-[var(--bg-app)] p-3 rounded-xl border border-[var(--bg-tertiary)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">Participante {idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => removeParticipante(idx)}
                          className="text-red-500 hover:bg-red-500/10 p-1 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Nome do participante"
                            value={p.nome}
                            onChange={(e) => updateParticipante(idx, { nome: e.target.value })}
                            className="w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-general)] focus:outline-hidden"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              placeholder={p.isPorcentagem ? "%" : "Valor"}
                              value={p.valor || ''}
                              onChange={(e) => updateParticipante(idx, { valor: parseFloat(e.target.value) || 0 })}
                              className="w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-general)] focus:outline-hidden"
                            />
                            {p.isPorcentagem && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-500">
                                {((parseFloat(valor.replace(',', '.')) || 0) * (p.valor / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            )}
                          </div>
                          <div className="flex bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg p-0.5 gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateParticipante(idx, { isPorcentagem: false })}
                              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                !p.isPorcentagem 
                                  ? 'bg-indigo-500 text-white shadow-xs' 
                                  : 'text-[var(--text-discreto)] hover:bg-[var(--bg-tertiary)]'
                              }`}
                            >
                              R$
                            </button>
                            <button
                              type="button"
                              onClick={() => updateParticipante(idx, { isPorcentagem: true })}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                p.isPorcentagem 
                                  ? 'bg-indigo-500 text-white shadow-xs' 
                                  : 'text-[var(--text-discreto)] hover:bg-[var(--bg-tertiary)]'
                              }`}
                            >
                              %
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addParticipante}
                    className="w-full py-2.5 border border-dashed border-[var(--bg-tertiary)] rounded-xl text-indigo-500 flex items-center justify-center gap-2 hover:bg-indigo-500/5 transition-all text-xs font-bold"
                  >
                    <Plus size={16} /> Adicionar Participante
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Date Selector */}
          <div>
            <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-2">DATA</span>
            <div className="flex gap-2 text-sm">
              {(['hoje', 'ontem', 'personalizado'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDataSelection(opt)}
                  className={`flex-1 py-2 px-3 rounded-[12px] flex items-center justify-center gap-1.5 border transition-all ${
                    dataSelection === opt
                      ? 'bg-[var(--bg-secondary)] border-[var(--bg-secondary)] text-white font-medium'
                      : 'bg-transparent border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                  }`}
                >
                  {opt === 'personalizado' && <Calendar size={14} />}
                  {opt === 'hoje' && 'Hoje'}
                  {opt === 'ontem' && 'Ontem'}
                  {opt === 'personalizado' && 'Outro'}
                </button>
              ))}
            </div>

            {dataSelection === 'personalizado' && (
              <input
                type="date"
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                className="w-full mt-2 py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[12px] text-[var(--text-general)] focus:outline-hidden text-sm"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">DESCRIÇÃO</span>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Almoço no restaurante, Salário..."
              className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-[var(--text-general)] focus:outline-hidden focus:border-[var(--bg-secondary)] text-sm"
              id="modal-desc-input"
            />
          </div>

          {/* Type specific drop downs */}
          {tipo === 'despesa_cartao' && (
            <div>
              <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">CARTÃO DE CRÉDITO</span>
              <select
                value={cartaoId}
                onChange={(e) => setCartaoId(e.target.value)}
                className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-[var(--text-general)] focus:outline-hidden text-sm"
              >
                {cartoes.length === 0 ? (
                  <option value="">Nenhum cartão cadastrado</option>
                ) : (
                  cartoes.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.nome} (Fatura Dia {card.diaVencimento})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Category Selector (not for transfers) */}
          {tipo !== 'transferencia' && (
            <div>
              <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">CATEGORIA</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-[var(--text-general)] focus:outline-hidden text-sm"
              >
                {filteredCategorias.length === 0 ? (
                  <option value="">Nenhuma categoria cadastrada</option>
                ) : (
                  filteredCategorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Source Account (For Income/Expense/Transfer) */}
          {tipo !== 'despesa_cartao' && (
            <div>
              <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">
                {tipo === 'transferencia' ? 'DA CONTA (ORIGEM)' : 'CONTA BANCÁRIA'}
              </span>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-[var(--text-general)] focus:outline-hidden text-sm"
              >
                {contas.length === 0 ? (
                  <option value="">Nenhuma conta cadastrada</option>
                ) : (
                  contas.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Destination Account (Only for Transfer) */}
          {tipo === 'transferencia' && (
            <div>
              <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">PARA CONTA (DESTINO)</span>
              <select
                value={paraContaId}
                onChange={(e) => setParaContaId(e.target.value)}
                className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-[var(--text-general)] focus:outline-hidden text-sm"
              >
                {contas.length === 0 ? (
                  <option value="">Nenhuma conta cadastrada</option>
                ) : (
                  contas.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Recurrence Toggles (Only for Receita, Despesa, Despesa de Cartão) */}
          {tipo !== 'transferencia' && (
            <div className="border-t border-[var(--bg-tertiary)] pt-4 space-y-4">
              {tipo !== 'despesa_cartao' && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-general)] block">Fixo / Recorrente</span>
                    <span className="text-xs text-[var(--text-discreto)]">Repetir todos os meses sem limite</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFixoRecorrente(!fixoRecorrente);
                      if (!fixoRecorrente) setParcelado(false); // mutually exclusive
                    }}
                    className={`toggle-switch rounded-full transition-colors ${
                      fixoRecorrente ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                        fixoRecorrente ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-[var(--text-general)] block">
                    {tipo === 'receita' ? 'Receita Parcelada' : tipo === 'despesa' ? 'Despesa Parcelada' : 'Parcelado'}
                  </span>
                  <span className="text-xs text-[var(--text-discreto)]">Repetir por um número fixo de meses</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParcelado(!parcelado);
                    if (!parcelado) setNumParcelas(''); // Reset to empty when toggling ON
                    if (!parcelado) setFixoRecorrente(false); // mutually exclusive
                  }}
                  className={`toggle-switch rounded-full transition-colors ${
                    parcelado ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                      parcelado ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {parcelado && (
                <div className="flex flex-col gap-3 bg-[var(--bg-app)] p-3 rounded-[16px] border border-[var(--bg-tertiary)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[var(--text-discreto)] uppercase">Número de Parcelas:</span>
                    <input
                      type="number"
                      min="2"
                      max="120"
                      value={numParcelas}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNumParcelas(val === '' ? '' : parseInt(val));
                      }}
                      className="w-16 text-center bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[8px] py-1 text-sm text-[var(--text-general)] focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 relative">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[var(--text-discreto)] uppercase">Valor da Parcela:</span>
                      <button type="button" onClick={() => setShowValorParcelaInfo(true)}>
                        <Info size={14} className="text-[var(--text-discreto)]" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValorEhPorParcela(!valorEhPorParcela)}
                      className={`toggle-switch rounded-full transition-colors ${
                        valorEhPorParcela ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${
                          valorEhPorParcela ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-center border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-sm text-[var(--text-general)] font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            id="modal-confirm-button"
            onClick={handleConfirm}
            className={`flex-1 py-3 text-center rounded-[16px] text-sm text-white font-bold transition-all hover:opacity-90 flex items-center justify-center gap-1 shadow-sm ${
              tipo === 'receita'
                ? 'bg-[#00cc52]'
                : tipo === 'despesa'
                ? 'bg-[#d03c4d]'
                : tipo === 'despesa_cartao'
                ? 'bg-[#ed793a]'
                : 'bg-[#1c7ae4]'
            }`}
          >
            <Check size={16} /> Confirmar
          </button>
        </div>

      </div>
      <FloatingInfoModal
        isOpen={showValorParcelaInfo}
        onClose={() => setShowValorParcelaInfo(false)}
        title="Configuração das Parcelas"
        subtitle="Divisão ou Repetição"
        icon={<Info size={20} />}
        description="Escolha como o valor de cada parcela do seu lançamento parcelado deve ser calculado:"
        bullets={[
          {
            title: "Dividir Valor Total (Desativado)",
            text: "O valor digitado no campo principal é considerado o total e será dividido igualmente entre todas as parcelas."
          },
          {
            title: "Repetir por Parcela (Ativado)",
            text: "O valor digitado no campo principal será aplicado integralmente em cada uma das parcelas individualmente."
          }
        ]}
      />
    </div>
  );

  function recebidaStatus() {
    return recebidoPagoEfetivado;
  }
}
