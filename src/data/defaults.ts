import { Conta, Cartao, Categoria, Lancamento, Cofrinho, CofrinhoHistorico } from '../types';

export const OFFICIAL_CATEGORIES: { id: string; nome: string; icone: string }[] = [
  { id: 'cat-ajuste', nome: 'Ajuste', icone: 'ajuste' },
  { id: 'cat-alugueis', nome: 'Aluguéis', icone: 'alugueis' },
  { id: 'cat-alimentacao', nome: 'Alimentação', icone: 'alimentacao' },
  { id: 'cat-supermercado', nome: 'Supermercado', icone: 'supermercado' },
  { id: 'cat-assinaturas', nome: 'Assinaturas', icone: 'assinaturas' },
  { id: 'cat-comer-fora', nome: 'Comer Fora', icone: 'comer-fora' },
  { id: 'cat-delivery', nome: 'Delivery', icone: 'delivery' },
  { id: 'cat-compras', nome: 'Compras', icone: 'compras' },
  { id: 'cat-contas-basicas', nome: 'Contas Básicas', icone: 'contas-basicas' },
  { id: 'cat-cuidados-pessoais', nome: 'Cuidados Pessoais', icone: 'cuidados-pessoais' },
  { id: 'cat-dividas-emprestimos', nome: 'Dívidas e Empréstimos', icone: 'dividas-emprestimos' },
  { id: 'cat-doacoes', nome: 'Doações', icone: 'doacoes' },
  { id: 'cat-dividendos', nome: 'Dividendos', icone: 'dividendos' },
  { id: 'cat-educacao', nome: 'Educação', icone: 'educacao' },
  { id: 'cat-estorno', nome: 'Estorno', icone: 'estorno' },
  { id: 'cat-extras', nome: 'Extras', icone: 'extras' },
  { id: 'cat-ferias', nome: 'Férias', icone: 'ferias' },
  { id: 'cat-habitacao', nome: 'Habitação', icone: 'habitacao' },
  { id: 'cat-impostos-taxas', nome: 'Impostos e Taxas', icone: 'impostos-taxas' },
  { id: 'cat-imprevistos', nome: 'Imprevistos', icone: 'imprevistos' },
  { id: 'cat-investimentos-aplicacoes', nome: 'Investimentos e Aplicações', icone: 'investimentos-aplicacoes' },
  { id: 'cat-lazer', nome: 'Lazer', icone: 'lazer' },
  { id: 'cat-loteria', nome: 'Loteria', icone: 'loteria' },
  { id: 'cat-outras-receitas', nome: 'Outras Receitas', icone: 'outras-receitas' },
  { id: 'cat-outros-gastos', nome: 'Outros Gastos', icone: 'outros-gastos' },
  { id: 'cat-pets', nome: 'Pets', icone: 'pets' },
  { id: 'cat-presentes-receitas', nome: 'Presentes Receitas', icone: 'presentes-receitas' },
  { id: 'cat-reembolsos', nome: 'Reembolsos', icone: 'reembolsos' },
  { id: 'cat-rendimentos', nome: 'Rendimentos', icone: 'rendimentos' },
  { id: 'cat-salario', nome: 'Salário', icone: 'salario' },
  { id: 'cat-saude', nome: 'Saúde', icone: 'saude' },
  { id: 'cat-seguros', nome: 'Seguros', icone: 'seguros' },
  { id: 'cat-transferencia', nome: 'Transferência', icone: 'transferencia' },
  { id: 'cat-transporte', nome: 'Transporte', icone: 'transporte' },
  { id: 'cat-combustivel', nome: 'Combustível', icone: 'combustivel' },
  { id: 'cat-vendas', nome: 'Vendas', icone: 'vendas' },
  { id: 'cat-vestuario-acessorios', nome: 'Vestuário e Acessórios', icone: 'vestuario-acessorios' },
];

export const DEFAULT_CATEGORIES_RECEITA: string[] = OFFICIAL_CATEGORIES.map(c => c.nome);
export const DEFAULT_CATEGORIES_DESPESA: string[] = OFFICIAL_CATEGORIES.map(c => c.nome);

export const getDefaultState = () => {
  const categorias: Categoria[] = OFFICIAL_CATEGORIES.map(c => ({
    id: c.id,
    nome: c.nome,
    icone: c.icone,
    tipo: 'geral' as const
  }));

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

  const lancamentos: Lancamento[] = [
    {
      id: 'lanc-1',
      tipo: 'receita',
      valor: 5500.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-01',
      descricao: 'Salário Mensal',
      categoriaId: 'cat-salario',
      contaId: 'conta-1'
    },
    {
      id: 'lanc-2',
      tipo: 'despesa',
      valor: 1800.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-05',
      descricao: 'Aluguel do Mês',
      categoriaId: 'cat-alugueis',
      contaId: 'conta-1',
      fixoRecorrente: true
    },
    {
      id: 'lanc-3',
      tipo: 'despesa',
      valor: 350.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-08',
      descricao: 'Supermercado Mensal',
      categoriaId: 'cat-alimentacao',
      contaId: 'conta-2'
    },
    {
      id: 'lanc-4',
      tipo: 'despesa_cartao',
      valor: 120.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-10',
      dataCompra: '2026-06-10',
      descricao: 'Jantar Restaurante',
      categoriaId: 'cat-comer-fora',
      cartaoId: 'cartao-1'
    },
    {
      id: 'lanc-5',
      tipo: 'despesa_cartao',
      valor: 200.00,
      recebidoPagoEfetivado: true,
      data: '2026-06-12',
      dataCompra: '2026-06-12',
      descricao: 'Combustível Carro',
      categoriaId: 'cat-transporte',
      cartaoId: 'cartao-2'
    }
  ];

  const cofrinhoHistorico: CofrinhoHistorico[] = [
    {
      id: 'hist-1',
      cofrinhoId: 'cof-1',
      tipo: 'deposito',
      valor: 500.00,
      data: '2026-06-02',
      motivo: 'Depósito inicial reserva'
    }
  ];

  return {
    contas,
    cartoes,
    categorias,
    lancamentos,
    cofrinhos,
    cofrinhoHistorico,
    metas: [],
    metaContribuicoes: [],
    deletedIds: [],
    theme: 'clean' as const,
    lastModifiedAt: Date.now()
  };
};
