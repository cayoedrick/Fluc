import { Conta, Cartao, Categoria, Lancamento, Cofrinho, CofrinhoHistorico } from '../types';

export const DEFAULT_CATEGORIES_RECEITA: string[] = [
  'Ajuste', 'Estorno', 'Extras', 'Férias', 'Outras Receitas', 
  'Reembolso', 'Rendimentos', 'Restituição', 'Salário', 'Transferências'
];

export const DEFAULT_CATEGORIES_DESPESA: string[] = [
  'Ajuste', 'Alimentação', 'Assinaturas', 'Combustível', 'Compras', 
  'Delivery', 'Lazer', 'Moradia', 'Outros Gastos', 'Presente', 
  'Saúde', 'Serviços', 'Supermercado', 'Transporte'
];

export const getDefaultState = () => {
  const categorias: Categoria[] = [
    ...DEFAULT_CATEGORIES_RECEITA.map((nome, index) => ({
      id: `cat-rec-${index}`,
      nome,
      tipo: 'receita' as const
    })),
    ...DEFAULT_CATEGORIES_DESPESA.map((nome, index) => ({
      id: `cat-desp-${index}`,
      nome,
      tipo: 'despesa' as const
    }))
  ];

  const contas: Conta[] = [
    { id: 'conta-1', nome: 'Conta Corrente Itaú', saldoInicial: 3500.00, cor: '#1c7ae4' },
    { id: 'conta-2', nome: 'Nubank (Saldo)', saldoInicial: 1500.00, cor: '#507b84' },
    { id: 'conta-3', nome: 'Carteira Dinheiro', saldoInicial: 250.00, cor: '#ed793a' }
  ];

  const cartoes: Cartao[] = [
    {
      id: 'cartao-1',
      nome: 'Nubank Gold',
      limiteTotal: 4000.00,
      limiteUtilizado: 320.00,
      diaFechamento: 3,
      diaVencimento: 10,
      contaVinculadaId: 'conta-2',
      cor: '#507b84'
    },
    {
      id: 'cartao-2',
      nome: 'Itaú Platinum',
      limiteTotal: 8000.00,
      limiteUtilizado: 1250.00,
      diaFechamento: 15,
      diaVencimento: 22,
      contaVinculadaId: 'conta-1',
      cor: '#ed793a'
    }
  ];

  const cofrinhos: Cofrinho[] = [
    { id: 'cof-1', nome: 'Reserva de Emergência', saldoAtual: 2500.00, meta: 10000.00, cor: '#00cc52', valorInicial: 2000.00 },
    { id: 'cof-2', nome: 'Viagem de Férias', saldoAtual: 800.00, meta: 4000.00, cor: '#1c7ae4', valorInicial: 784.50 },
    { id: 'cof-3', nome: 'Novo Computador', saldoAtual: 450.00, meta: 5000.00, cor: '#ed793a', valorInicial: 450.00 }
  ];

  const cofrinhoHistorico: CofrinhoHistorico[] = [
    {
      id: 'h-1',
      cofrinhoId: 'cof-1',
      tipo: 'deposito',
      valor: 500.00,
      data: '2026-06-15',
      contaId: 'conta-1'
    },
    {
      id: 'h-2',
      cofrinhoId: 'cof-2',
      tipo: 'rendimento_adicionar',
      valor: 15.50,
      data: '2026-06-20',
      periodo: '30 dias'
    }
  ];

  // Some default realistic launches
  const lancamentos: Lancamento[] = [
    {
      id: 'lanc-1',
      tipo: 'receita',
      valor: 4500.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-05',
      descricao: 'Salário Mensal',
      categoriaId: categorias.find(c => c.nome === 'Salário' && c.tipo === 'receita')?.id || 'cat-rec-8',
      contaId: 'conta-1'
    },
    {
      id: 'lanc-2',
      tipo: 'despesa',
      valor: 1200.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-10',
      descricao: 'Aluguel do Apartamento',
      categoriaId: categorias.find(c => c.nome === 'Moradia' && c.tipo === 'despesa')?.id || 'cat-desp-7',
      contaId: 'conta-1',
      fixoRecorrente: true
    },
    {
      id: 'lanc-3',
      tipo: 'despesa',
      valor: 185.50,
      recebidoPagoEfetivado: true,
      data: '2026-06-12',
      descricao: 'Supermercado Mensal',
      categoriaId: categorias.find(c => c.nome === 'Supermercado' && c.tipo === 'despesa')?.id || 'cat-desp-12',
      contaId: 'conta-2'
    },
    {
      id: 'lanc-4',
      tipo: 'despesa_cartao',
      valor: 89.90,
      recebidoPagoEfetivado: true,
      estorno: false,
      data: '2026-06-14',
      descricao: 'Assinatura Netflix & Spotify',
      categoriaId: categorias.find(c => c.nome === 'Assinaturas' && c.tipo === 'despesa')?.id || 'cat-desp-2',
      cartaoId: 'cartao-1'
    },
    {
      id: 'lanc-5',
      tipo: 'despesa_cartao',
      valor: 240.00,
      recebidoPagoEfetivado: true,
      estorno: false,
      data: '2026-06-18',
      descricao: 'Jantar com Amigos',
      categoriaId: categorias.find(c => c.nome === 'Lazer' && c.tipo === 'despesa')?.id || 'cat-desp-6',
      cartaoId: 'cartao-2'
    },
    {
      id: 'lanc-6',
      tipo: 'transferencia',
      valor: 300.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-21',
      descricao: 'Reposição Carteira',
      contaId: 'conta-1', // da conta
      paraContaId: 'conta-3' // para conta
    },
    {
      id: 'lanc-cof-dep-1',
      tipo: 'deposito_cofrinho',
      valor: 500.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-15',
      descricao: 'Depósito: Reserva de Emergência',
      contaId: 'conta-1',
      cofrinhoId: 'cof-1'
    }
  ];

  return {
    contas,
    cartoes,
    categorias,
    lancamentos,
    cofrinhos,
    cofrinhoHistorico,
    theme: 'clean' as const
  };
};
