import React, { useState } from 'react';
import { Conta, Cartao } from '../types';
import { Plus, Landmark, CreditCard, Paintbrush, Check, X, HelpCircle } from 'lucide-react';

interface ContasCartoesViewProps {
  contas: Conta[];
  cartoes: Cartao[];
  getAccountBalance: (id: string) => number;
  onAddConta: (c: Omit<Conta, 'id'>) => void;
  onAddCartao: (c: Omit<Cartao, 'id'>) => void;
  onDeleteConta: (id: string) => void;
  onDeleteCartao: (id: string) => void;
  onEditConta: (id: string, c: Partial<Conta>) => void;
  onEditCartao: (id: string, c: Partial<Cartao>) => void;
  onOpenMenu?: () => void;
}

const PRESET_COLORS = [
  '#1c7ae4', // Blue
  '#00cc52', // Green
  '#d03c4d', // Red
  '#ed793a', // Orange
  '#507b84', // Slate Green
  '#8e44ad', // Purple
  '#f1c40f', // Yellow
];

export function ContasCartoesView({
  contas,
  cartoes,
  getAccountBalance,
  onAddConta,
  onAddCartao,
  onDeleteConta,
  onDeleteCartao,
  onEditConta,
  onEditCartao,
  onOpenMenu
}: ContasCartoesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'conta' | 'cartao'>('conta');

  // Form Fields - Account
  const [contaNome, setContaNome] = useState<string>('');
  const [contaSaldo, setContaSaldo] = useState<string>('');
  const [contaCor, setContaCor] = useState<string>('#1c7ae4');

  // Form Fields - Card
  const [cartaoNome, setCartaoNome] = useState<string>('');
  const [cartaoLimite, setCartaoLimite] = useState<string>('');
  const [cartaoLimiteUtilizado, setCartaoLimiteUtilizado] = useState<string>('');
  const [cartaoDiaFechamento, setCartaoDiaFechamento] = useState<number>(3);
  const [cartaoDiaVencimento, setCartaoDiaVencimento] = useState<number>(10);
  const [cartaoContaVinculada, setCartaoContaVinculada] = useState<string>('');
  const [cartaoCor, setCartaoCor] = useState<string>('#507b84');

  // Custom Color State
  const [customColor, setCustomColor] = useState<string>('#ff00bb');
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false);

  // Edit States
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);

  const handleStartEditConta = (c: Conta) => {
    setEditingConta(c);
    setModalTab('conta');
    setContaNome(c.nome);
    setContaSaldo(String(c.saldoInicial).replace('.', ','));
    setContaCor(c.cor);
    const isPreset = PRESET_COLORS.includes(c.cor);
    setUseCustomColor(!isPreset);
    if (!isPreset) {
      setCustomColor(c.cor);
    }
    setIsModalOpen(true);
  };

  const handleStartEditCartao = (card: Cartao) => {
    setEditingCartao(card);
    setModalTab('cartao');
    setCartaoNome(card.nome);
    setCartaoLimite(String(card.limiteTotal).replace('.', ','));
    setCartaoLimiteUtilizado(String(card.limiteUtilizado).replace('.', ','));
    setCartaoDiaFechamento(card.diaFechamento);
    setCartaoDiaVencimento(card.diaVencimento);
    setCartaoContaVinculada(card.contaVinculadaId);
    setCartaoCor(card.cor);
    const isPreset = PRESET_COLORS.includes(card.cor);
    setUseCustomColor(!isPreset);
    if (!isPreset) {
      setCustomColor(card.cor);
    }
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingConta(null);
    setEditingCartao(null);
    setIsModalOpen(true);
    // Set default linked account if available
    if (contas.length > 0) {
      setCartaoContaVinculada(contas[0].id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Reset inputs
    setContaNome('');
    setContaSaldo('');
    setCartaoNome('');
    setCartaoLimite('');
    setCartaoLimiteUtilizado('');
    setEditingConta(null);
    setEditingCartao(null);
    setUseCustomColor(false);
  };

  const handleSave = () => {
    const finalCor = useCustomColor ? customColor : (modalTab === 'conta' ? contaCor : cartaoCor);

    if (modalTab === 'conta') {
      if (!contaNome.trim()) {
        alert('Por favor, insira o nome da conta.');
        return;
      }
      const saldo = parseFloat(contaSaldo.replace(',', '.'));
      if (isNaN(saldo)) {
        alert('Por favor, insira um saldo válido.');
        return;
      }

      if (editingConta) {
        onEditConta(editingConta.id, {
          nome: contaNome.trim(),
          saldoInicial: saldo,
          cor: finalCor
        });
      } else {
        onAddConta({
          nome: contaNome.trim(),
          saldoInicial: saldo,
          cor: finalCor
        });
      }
    } else {
      if (!cartaoNome.trim()) {
        alert('Por favor, insira o nome do cartão.');
        return;
      }
      const limite = parseFloat(cartaoLimite.replace(',', '.'));
      const utilizado = parseFloat(cartaoLimiteUtilizado.replace(',', '.'));
      if (isNaN(limite) || isNaN(utilizado)) {
        alert('Por favor, insira valores válidos para os limites.');
        return;
      }

      if (editingCartao) {
        onEditCartao(editingCartao.id, {
          nome: cartaoNome.trim(),
          limiteTotal: limite,
          limiteUtilizado: utilizado,
          diaFechamento: cartaoDiaFechamento,
          diaVencimento: cartaoDiaVencimento,
          contaVinculadaId: cartaoContaVinculada,
          cor: finalCor
        });
      } else {
        onAddCartao({
          nome: cartaoNome.trim(),
          limiteTotal: limite,
          limiteUtilizado: utilizado,
          diaFechamento: cartaoDiaFechamento,
          diaVencimento: cartaoDiaVencimento,
          contaVinculadaId: cartaoContaVinculada,
          cor: finalCor
        });
      }
    }

    handleCloseModal();
  };

  const handleDeleteEntity = (id: string, type: 'conta' | 'cartao') => {
    const msg = type === 'conta' 
      ? 'Tem certeza de que deseja excluir esta conta? Lançamentos vinculados à esta conta perderão o vínculo.'
      : 'Tem certeza de que deseja excluir este cartão de crédito?';
    if (window.confirm(msg)) {
      if (type === 'conta') {
        onDeleteConta(id);
      } else {
        onDeleteCartao(id);
      }
    }
  };

  return (
    <div id="contas-cartoes-container" className="w-full flex-1 flex flex-col space-y-6">
      
      {/* 1. Header */}
      <div className="flex justify-between items-center pb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] text-[var(--text-general)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-general)] tracking-tight">Contas e Cartões</h2>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] text-white flex items-center justify-center hover:opacity-90 transition-all cursor-pointer"
          title="Adicionar Conta ou Cartão"
        >
          <Plus size={20} className="stroke-[2.5]" />
        </button>
      </div>

      {/* 2. Grid Section - Contas Bancárias */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider flex items-center gap-1.5">
          <Landmark size={14} />
          <span>Contas Bancárias ({contas.length})</span>
        </h3>

        {contas.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-8 rounded-[24px] text-center text-[var(--text-discreto)] text-sm">
            Nenhuma conta bancária cadastrada. Clique em "+" acima para adicionar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contas.map((c) => {
              const currentBal = getAccountBalance(c.id);
              return (
                <div 
                  key={c.id} 
                  className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] flex flex-col justify-between min-h-[140px] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: c.cor }} />
                  
                  <div className="flex items-start justify-between pr-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-[10px] text-white" style={{ backgroundColor: c.cor + '20', color: c.cor }}>
                        <Landmark size={16} />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-general)]">{c.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleStartEditConta(c)}
                        className="text-xs text-[var(--text-discreto)] hover:text-[var(--bg-secondary)] font-semibold cursor-pointer transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteEntity(c.id, 'conta')}
                        className="text-xs text-[var(--text-discreto)] hover:text-red-500 font-semibold cursor-pointer transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">Saldo Atual</span>
                    <span className="text-2xl font-extrabold text-[var(--text-general)]">
                      R$ {currentBal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-[var(--text-discreto)] block">
                      Saldo Inicial: R$ {c.saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Grid Section - Cartões de Crédito */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[var(--text-discreto)] uppercase tracking-wider flex items-center gap-1.5">
          <CreditCard size={14} />
          <span>Cartões de Crédito ({cartoes.length})</span>
        </h3>

        {cartoes.length === 0 ? (
          <div className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-8 rounded-[24px] text-center text-[var(--text-discreto)] text-sm">
            Nenhum cartão cadastrado. Clique em "+" acima para adicionar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cartoes.map((card) => {
              const linkedAccount = contas.find(c => c.id === card.contaVinculadaId);
              return (
                <div 
                  key={card.id} 
                  className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] p-5 rounded-[24px] flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: card.cor }} />

                  <div className="flex items-start justify-between pr-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-[10px] text-white" style={{ backgroundColor: card.cor + '20', color: card.cor }}>
                        <CreditCard size={16} />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-general)]">{card.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleStartEditCartao(card)}
                        className="text-xs text-[var(--text-discreto)] hover:text-[var(--bg-secondary)] font-semibold cursor-pointer transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteEntity(card.id, 'cartao')}
                        className="text-xs text-[var(--text-discreto)] hover:text-red-500 font-semibold cursor-pointer transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">Limite Total</span>
                      <span className="font-bold text-[var(--text-general)]">R$ {card.limiteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase block">Limite Utilizado</span>
                      <span className="font-bold text-[#ed793a]">R$ {card.limiteUtilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-[var(--bg-tertiary)] flex justify-between text-[10px] text-[var(--text-discreto)] font-semibold">
                      <span>Fechamento: Dia {card.diaFechamento}</span>
                      <span>Vencimento: Dia {card.diaVencimento}</span>
                    </div>
                    <div className="col-span-2 text-[10px] text-[var(--text-discreto)]">
                      Conta Débito: <span className="text-[var(--text-general)] font-bold">{linkedAccount?.nome || 'Não vinculada'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL POPUP FOR ACCOUNTS & CARDS (EXACT SPECIFICATION) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[24px] overflow-hidden flex flex-col">
            
            {/* Top Toggle buttons: Conta vs Cartão */}
            {!editingConta && !editingCartao ? (
              <div className="flex bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] p-1 text-sm font-medium gap-1">
                <button
                  type="button"
                  onClick={() => setModalTab('conta')}
                  className={`flex-1 py-2 px-3 text-center rounded-[12px] transition-colors ${
                    modalTab === 'conta'
                      ? 'bg-[var(--bg-primary)] text-[var(--text-general)] font-semibold border border-[var(--bg-tertiary)]'
                      : 'text-[var(--text-discreto)]'
                  }`}
                >
                  Nova Conta Bancária
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('cartao')}
                  className={`flex-1 py-2 px-3 text-center rounded-[12px] transition-colors ${
                    modalTab === 'cartao'
                      ? 'bg-[var(--bg-primary)] text-[var(--text-general)] font-semibold border border-[var(--bg-tertiary)]'
                      : 'text-[var(--text-discreto)]'
                  }`}
                >
                  Novo Cartão de Crédito
                </button>
              </div>
            ) : (
              <div className="bg-[var(--bg-app)] border-b border-[var(--bg-tertiary)] p-4 text-center">
                <h3 className="text-sm font-extrabold text-[var(--text-general)]">
                  {editingConta ? 'Editar Conta Bancária' : 'Editar Cartão de Crédito'}
                </h3>
              </div>
            )}

            {/* Modal Form Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {modalTab === 'conta' ? (
                <>
                  {/* Account Name */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DA CONTA</span>
                    <input
                      type="text"
                      placeholder="Ex: Banco Bradesco, Carteira, Dinheiro"
                      value={contaNome}
                      onChange={(e) => setContaNome(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                    />
                  </div>

                  {/* Saldo Inicial */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">SALDO INICIAL (R$)</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={contaSaldo}
                      onChange={(e) => setContaSaldo(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Card Name */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">NOME DO CARTÃO</span>
                    <input
                      type="text"
                      placeholder="Ex: Nubank, Visa Infinite"
                      value={cartaoNome}
                      onChange={(e) => setCartaoNome(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Limite Total */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">LIMITE TOTAL (R$)</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={cartaoLimite}
                        onChange={(e) => setCartaoLimite(e.target.value)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] font-bold focus:outline-hidden"
                      />
                    </div>

                    {/* Limite Utilizado */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">LIMITE UTILIZADO (R$)</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={cartaoLimiteUtilizado}
                        onChange={(e) => setCartaoLimiteUtilizado(e.target.value)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Dia Fechamento */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">DIA DE FECHAMENTO</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={cartaoDiaFechamento}
                        onChange={(e) => setCartaoDiaFechamento(parseInt(e.target.value) || 1)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      />
                    </div>

                    {/* Dia Vencimento */}
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--text-discreto)] block mb-1">DIA DE VENCIMENTO</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={cartaoDiaVencimento}
                        onChange={(e) => setCartaoDiaVencimento(parseInt(e.target.value) || 1)}
                        className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Conta Vinculada */}
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-discreto)] block mb-1">CONTA VINCULADA</span>
                    <select
                      value={cartaoContaVinculada}
                      onChange={(e) => setCartaoContaVinculada(e.target.value)}
                      className="w-full py-2.5 px-4 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-[16px] text-sm text-[var(--text-general)] focus:outline-hidden"
                    >
                      <option value="">Sem conta vinculada</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Color Selection with preset palette & custom picker Represented by brush */}
              <div className="space-y-2 border-t border-[var(--bg-tertiary)] pt-3">
                <span className="text-xs font-semibold text-[var(--text-discreto)] block">ESCOLHA UMA COR</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  {!useCustomColor && PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (modalTab === 'conta') setContaCor(c);
                        else setCartaoCor(c);
                      }}
                      className="w-8 h-8 rounded-full border border-[var(--bg-tertiary)] flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {((modalTab === 'conta' && contaCor === c) || (modalTab === 'cartao' && cartaoCor === c)) && (
                        <Check size={14} className="text-white" />
                      )}
                    </button>
                  ))}

                  {/* Brush icon representing Custom Color Selection */}
                  <button
                    type="button"
                    onClick={() => setUseCustomColor(!useCustomColor)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                      useCustomColor 
                        ? 'border-[var(--text-general)] text-[var(--text-general)] bg-[var(--bg-tertiary)]' 
                        : 'border-[var(--bg-tertiary)] text-[var(--text-discreto)] bg-transparent'
                    }`}
                    title="Cor Personalizada"
                  >
                    <Paintbrush size={16} />
                  </button>

                  {useCustomColor && (
                    <div className="flex items-center gap-2 ml-1 bg-[var(--bg-app)] py-1 px-2.5 rounded-[12px] border border-[var(--bg-tertiary)]">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-6 h-6 rounded-md bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-[10px] font-bold font-mono text-[var(--text-general)] uppercase">
                        {customColor}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--bg-tertiary)] flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 border border-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] rounded-[16px] text-sm text-[var(--text-general)] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-[var(--bg-secondary)] text-white hover:opacity-90 rounded-[16px] text-sm font-semibold flex items-center justify-center gap-1"
              >
                <Check size={16} /> Confirmar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
