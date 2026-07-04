export interface Conta {
  id: string;
  nome: string;
  saldoInicial: number;
  cor: string;
  updatedAt?: number;
}

export interface Cartao {
  id: string;
  nome: string;
  limiteTotal: number;
  limiteUtilizado: number;
  diaFechamento: number;
  diaVencimento: number;
  contaVinculadaId: string;
  cor: string;
  updatedAt?: number;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  updatedAt?: number;
}

export interface Lancamento {
  id: string;
  tipo: 'receita' | 'despesa' | 'despesa_cartao' | 'transferencia';
  valor: number;
  recebidoPagoEfetivado: boolean; // Recebido (Receita), Pago (Despesa), Efetivado (Transferência)
  estorno?: boolean; // Estorno/Ajuste para Despesa de Cartão
  data: string; // YYYY-MM-DD
  descricao: string;
  categoriaId?: string;
  contaId?: string; // Conta Bancária (Receita/Despesa), "da conta" (Transferência)
  paraContaId?: string; // "para conta" (Transferência)
  cartaoId?: string; // Cartão de Crédito (Despesa de Cartão)
  fixoRecorrente?: boolean;
  parcelado?: boolean;
  numParcelas?: number;
  isValorParcela?: boolean;
  grupoId?: string;
  updatedAt?: number;
}

export interface Cofrinho {
  id: string;
  nome: string;
  saldoAtual: number;
  meta?: number;
  cor: string;
  updatedAt?: number;
}

export interface CofrinhoHistorico {
  id: string;
  cofrinhoId: string;
  tipo: 'deposito' | 'retirada' | 'rendimento_adicionar' | 'rendimento_atualizar';
  valor: number;
  data: string;
  contaId?: string;
  motivo?: string;
  periodo?: string; // '15 dias', '30 dias', '60 dias', 'personalizado'
  isInitial?: boolean;
  updatedAt?: number;
}

export type ViewType = 'dashboard' | 'extrato' | 'categorias' | 'contas_cartoes' | 'reservas_cofrinhos' | 'configuracoes';

export interface FlucState {
  contas: Conta[];
  cartoes: Cartao[];
  categorias: Categoria[];
  lancamentos: Lancamento[];
  cofrinhos: Cofrinho[];
  cofrinhoHistorico: CofrinhoHistorico[];
  theme: 'dark' | 'clean';
  deletedIds?: string[];
  lastSyncUpload?: number;
  lastSyncDownload?: number;
}
