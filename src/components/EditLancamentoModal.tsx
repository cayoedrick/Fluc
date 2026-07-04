import React, { useState, useEffect } from 'react';
import { Conta, Cartao, Categoria, Lancamento } from '../types';
import { X, Calendar, Check, Wallet, CreditCard, ArrowRight } from 'lucide-react';

interface EditLancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  onSave: (id: string, updatedFields: Partial<Lancamento>, mode: 'este' | 'futuros' | 'todos') => void;
}

export function EditLancamentoModal({
  isOpen,
  onClose,
  lancamento,
  contas,
  cartoes,
  categorias,
  onSave
}: EditLancamentoModalProps) {
  const [valor, setValor] = useState<string>('');
  const [recebidoPagoEfetivado, setRecebidoPagoEfetivado] = useState<boolean>(true);
  const [estorno, setEstorno] = useState<boolean>(false);
  const [data, setData] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [contaId, setContaId] = useState<string>('');
  const [paraContaId, setParaContaId] = useState<string>('');
  const [cartaoId, setCartaoId] = useState<string>('');
  
  // Show save choice sub-screen
  const [showSaveOptions, setShowSaveOptions] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && lancamento) {
      setValor(lancamento.valor.toString().replace('.', ','));
      setRecebidoPagoEfetivado(lancamento.recebidoPagoEfetivado);
      setEstorno(lancamento.estorno || false);
      setData(lancamento.data);
      setDescricao(lancamento.descricao);
      setCategoriaId(lancamento.categoriaId || '');
      setContaId(lancamento.contaId || '');
      setParaContaId(lancamento.paraContaId || '');
      setCartaoId(lancamento.cartaoId || '');
      setShowSaveOptions(false);
    }
  }, [isOpen, lancamento]);

  if (!isOpen || !lancamento) return null;

  const isIncome = lancamento.tipo === 'receita';
  const isCard = lancamento.tipo === 'despesa_cartao';
  const isTransf = lancamento.tipo === 'transferencia';
  const isExpense = lancamento.tipo === 'despesa';

  const filteredCategorias = categorias.filter(
    c => c.tipo === (isIncome ? 'receita' : 'despesa')
  );

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValor = parseFloat(valor.replace(',', '.'));
    if (isNaN(parsedValor) || parsedValor <= 0) {
      alert('Por favor, digite um valor válido.');
      return;
    }
    if (!descricao.trim()) {
      alert('Por favor, insira uma descrição.');
      return;
    }
    
    // Se o lançamento pertencer a um grupo, mostra as opções de salvamento. Caso contrário, salva direto.
    if (lancamento && lancamento.grupoId) {
      setShowSaveOptions(true);
    } else {
      handleExecuteSave('este');
    }
  };

  const handleExecuteSave = (mode: 'este' | 'futuros' | 'todos') => {
    const parsedValor = parseFloat(valor.replace(',', '.'));
    const updated: Partial<Lancamento> = {
      valor: parsedValor,
      descricao: descricao.trim(),
      data,
      recebidoPagoEfetivado
    };

    if (isIncome || isExpense) {
      updated.categoriaId = categoriaId;
      updated.contaId = contaId;
    } else if (isCard) {
      updated.categoriaId = categoriaId;
      updated.cartaoId = cartaoId;
      updated.estorno = estorno;
    } else if (isTransf) {
      updated.contaId = contaId;
      updated.paraContaId = paraContaId;
    }

    onSave(lancamento.id, updated, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" id="edit-lancamento-modal">
      <div className="w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col focus:outline-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--bg-tertiary)]">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">Edição de Lançamento</span>
            <h3 className="text-sm font-extrabold text-[var(--text-general)]">
              {isIncome && 'Editar Receita'}
              {isExpense && 'Editar Despesa'}
              {isCard && 'Editar Lançamento Cartão'}
              {isTransf && 'Editar Transferência'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-app)] text-[var(--text-discreto)] hover:text-[var(--text-general)] rounded-full transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {!showSaveOptions ? (
          <form onSubmit={handlePreSave} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Value Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">VALOR (R$)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full text-3xl font-bold bg-transparent text-[var(--text-general)] focus:outline-hidden border-b border-dashed border-[var(--bg-secondary)] pb-1"
                />
              </div>

              {/* Status toggles */}
              <div className="text-right">
                {isIncome && (
                  <>
                    <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">RECEBIDO</span>
                    <button
                      type="button"
                      onClick={() => setRecebidoPagoEfetivado(!recebidoPagoEfetivado)}
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

                {isExpense && (
                  <>
                    <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">PAGO</span>
                    <button
                      type="button"
                      onClick={() => setRecebidoPagoEfetivado(!recebidoPagoEfetivado)}
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

                {isCard && (
                  <>
                    <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">ESTORNO</span>
                    <button
                      type="button"
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

                {isTransf && (
                  <>
                    <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">EFETIVADO</span>
                    <button
                      type="button"
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

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1.5">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Almoço, Salário, Internet..."
                className="w-full py-2.5 px-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] text-xs text-[var(--text-general)] focus:outline-hidden"
              />
            </div>

            {/* Category selection (not for Transferencia) */}
            {!isTransf && (
              <div>
                <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1.5">Categoria</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                  {filteredCategorias.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaId(cat.id)}
                      className={`px-3 py-1.5 rounded-[10px] border transition-colors shrink-0 ${
                        categoriaId === cat.id
                          ? 'bg-[var(--bg-secondary)] text-white border-[var(--bg-secondary)]'
                          : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                      }`}
                    >
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account / Card selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account from (or normal Account) */}
              {(isIncome || isExpense || isTransf) && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1.5">
                    {isTransf ? 'Conta de Origem' : 'Conta Bancária'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                    {contas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setContaId(c.id)}
                        className={`py-2 px-2.5 rounded-[12px] border text-left flex items-center gap-1.5 transition-all truncate ${
                          contaId === c.id
                            ? 'bg-[var(--bg-primary)] border-[var(--text-general)] text-[var(--text-general)] shadow-xs'
                            : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                        <span className="truncate">{c.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account to (Transfer) */}
              {isTransf && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1.5">
                    Conta de Destino
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                    {contas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setParaContaId(c.id)}
                        className={`py-2 px-2.5 rounded-[12px] border text-left flex items-center gap-1.5 transition-all truncate ${
                          paraContaId === c.id
                            ? 'bg-[var(--bg-primary)] border-[var(--text-general)] text-[var(--text-general)] shadow-xs'
                            : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                        <span className="truncate">{c.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Card selector */}
              {isCard && (
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1.5">
                    Cartão de Crédito
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-bold">
                    {cartoes.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setCartaoId(card.id)}
                        className={`py-2 px-2.5 rounded-[12px] border text-left flex items-center gap-1.5 transition-all truncate ${
                          cartaoId === card.id
                            ? 'bg-[var(--bg-primary)] border-[var(--text-general)] text-[var(--text-general)] shadow-xs'
                            : 'bg-[var(--bg-app)] border-[var(--bg-tertiary)] text-[var(--text-discreto)] hover:text-[var(--text-general)]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: card.cor }} />
                        <span className="truncate">{card.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1.5">Data</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-3 text-[var(--text-discreto)]" />
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full py-2 pl-9 pr-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[14px] text-xs text-[var(--text-general)] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-3 hover:opacity-90 text-white text-xs font-bold rounded-[14px] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isIncome
                    ? 'bg-[#00cc52]'
                    : isExpense
                    ? 'bg-[#d03c4d]'
                    : isCard
                    ? 'bg-[#ed793a]'
                    : 'bg-[#1c7ae4]'
                }`}
              >
                <Check size={16} className="stroke-[2.5]" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </form>
        ) : (
          /* Save choices screen as requested by user */
          <div className="p-6 space-y-5 text-center">
            <div className="py-2">
              <span className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
                <ArrowRight size={22} className="stroke-[2.5]" />
              </span>
              <h4 className="text-sm font-bold text-[var(--text-general)]">Como deseja salvar estas alterações?</h4>
              <p className="text-[11px] text-[var(--text-discreto)] mt-1 max-w-sm mx-auto">
                Este lançamento pode fazer parte de um grupo recorrente ou parcelado. Escolha o escopo da atualização.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                onClick={() => handleExecuteSave('este')}
                className="w-full py-3 bg-[var(--bg-app)] hover:bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-[var(--text-general)] text-xs font-bold rounded-[14px] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 p-3"
              >
                <span className={`font-extrabold text-sm ${
                  isIncome
                    ? 'text-[#00cc52]'
                    : isExpense
                    ? 'text-[#d03c4d]'
                    : isCard
                    ? 'text-[#ed793a]'
                    : 'text-[#1c7ae4]'
                }`}>Este</span>
                <span className="text-[10px] text-[var(--text-discreto)] font-normal">Altera apenas este lançamento no mês selecionado ({data.split('-').reverse().slice(1).join('/')})</span>
              </button>

              <button
                onClick={() => handleExecuteSave('futuros')}
                className={`w-full py-3 text-white hover:opacity-90 text-xs font-bold rounded-[14px] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 p-3 ${
                  isIncome
                    ? 'bg-[#00cc52]'
                    : isExpense
                    ? 'bg-[#d03c4d]'
                    : isCard
                    ? 'bg-[#ed793a]'
                    : 'bg-[#1c7ae4]'
                }`}
              >
                <span className="font-extrabold text-sm">Este e Futuros</span>
                <span className="text-[10px] text-white/80 font-normal">Altera o lançamento selecionado e todas as suas recorrências futuras</span>
              </button>

              <button
                onClick={() => handleExecuteSave('todos')}
                className="w-full py-3 bg-[var(--bg-secondary)] text-white hover:opacity-90 text-xs font-bold rounded-[14px] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 p-3"
              >
                <span className="font-extrabold text-sm">Todos</span>
                <span className="text-[10px] text-white/80 font-normal">Altera todos os lançamentos (passados, presentes e futuros) deste grupo</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--bg-tertiary)]">
              <button
                onClick={() => setShowSaveOptions(false)}
                className="text-xs font-bold text-[var(--text-discreto)] hover:text-[var(--text-general)] py-1.5 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
