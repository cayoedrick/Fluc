import React from 'react';
import { 
  Banknote, 
  TrendingUp, 
  PlusCircle, 
  LineChart, 
  Home, 
  Film, 
  ShoppingBag, 
  ShoppingCart,
  HandHelping,
  RotateCcw, 
  Gift, 
  Building2, 
  Zap, 
  Utensils, 
  HeartPulse, 
  GraduationCap, 
  Car, 
  Fuel,
  AlertTriangle, 
  PawPrint, 
  UtensilsCrossed, 
  Tv, 
  Shirt, 
  Smile, 
  Sprout, 
  CreditCard, 
  Receipt, 
  ShieldCheck, 
  HeartHandshake, 
  Sparkles, 
  Wrench, 
  Palmtree, 
  Undo2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  ArrowLeftRight,
  Tag 
} from 'lucide-react';

export interface CategoryIconProps {
  name?: string;
  icon?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function normalizeCategoryKey(nameOrIcon?: string): string {
  if (!nameOrIcon) return '';
  const clean = nameOrIcon
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (clean.includes('supermercado')) return 'supermercado';
  if (clean.includes('delivery')) return 'delivery';
  if (clean.includes('loteria')) return 'loteria';
  if (clean.includes('ajuste')) return 'ajuste';
  if (clean.includes('compra')) return 'compras';
  if (clean.includes('ferias')) return 'ferias';
  if (clean.includes('estorno')) return 'estorno';
  if (clean.includes('outras receitas')) return 'outras-receitas';
  if (clean.includes('outros gastos')) return 'outros-gastos';
  if (clean.includes('reembolso')) return 'reembolsos';
  if (clean.includes('transferencia')) return 'transferencia';
  if (clean.includes('salario')) return 'salario';
  if (clean.includes('dividendo')) return 'dividendos';
  if (clean.includes('extra')) return 'extras';
  if (clean.includes('rendimento')) return 'rendimentos';
  if (clean.includes('aluguel') || clean.includes('alugueis')) return 'alugueis';
  if (clean.includes('lazer')) return 'lazer';
  if (clean.includes('venda')) return 'vendas';
  if (clean.includes('presente')) return 'presentes-receitas';
  if (clean.includes('habitacao') || clean.includes('moradia')) return 'habitacao';
  if (clean.includes('contas') || clean.includes('basicas') || clean.includes('servico')) return 'contas-basicas';
  if (clean.includes('alimentacao')) return 'alimentacao';
  if (clean.includes('saude')) return 'saude';
  if (clean.includes('educacao')) return 'educacao';
  if (clean.includes('combustivel')) return 'combustivel';
  if (clean.includes('transporte')) return 'transporte';
  if (clean.includes('imprevisto') || clean.includes('outros')) return 'imprevistos';
  if (clean.includes('pet')) return 'pets';
  if (clean.includes('comer fora') || clean.includes('restaurante')) return 'comer-fora';
  if (clean.includes('assinatura')) return 'assinaturas';
  if (clean.includes('vestuario') || clean.includes('acessorio') || clean.includes('roupa')) return 'vestuario-acessorios';
  if (clean.includes('cuidado') || clean.includes('beleza')) return 'cuidados-pessoais';
  if (clean.includes('investimento') || clean.includes('aplicacao')) return 'investimentos-aplicacoes';
  if (clean.includes('divida') || clean.includes('emprestimo')) return 'dividas-emprestimos';
  if (clean.includes('imposto') || clean.includes('taxa')) return 'impostos-taxas';
  if (clean.includes('seguro')) return 'seguros';
  if (clean.includes('doacao') || clean.includes('doacoes')) return 'doacoes';

  return clean.replace(/[^a-z0-9]/g, '-');
}

export function CategoryIcon({
  name,
  icon,
  size = 20,
  className = '',
  strokeWidth = 2.0
}: CategoryIconProps) {
  const key = normalizeCategoryKey(icon || name);
  const iconProps = { size, className, strokeWidth };

  switch (key) {
    case 'salario': return <Banknote {...iconProps} />;
    case 'dividendos': return <TrendingUp {...iconProps} />;
    case 'extras': return <PlusCircle {...iconProps} />;
    case 'rendimentos': return <LineChart {...iconProps} />;
    case 'alugueis': return <Home {...iconProps} />;
    case 'lazer': return <Film {...iconProps} />;
    case 'vendas': return <ShoppingBag {...iconProps} />;
    case 'reembolsos':
    case 'reembolso': 
      return <HandHelping {...iconProps} />;
    case 'presentes-receitas': return <Gift {...iconProps} />;
    case 'habitacao': return <Building2 {...iconProps} />;
    case 'contas-basicas': return <Zap {...iconProps} />;
    case 'alimentacao': return <Utensils {...iconProps} />; // Fork and knife
    case 'supermercado': return <ShoppingCart {...iconProps} />; // Shopping cart
    case 'delivery': // Hamburger icon for delivery
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 11c0-3.5 3.5-5 8-5s8 1.5 8 5" />
          <path d="M3 13h18l-2 3H5z" />
          <path d="M4 17c0 2 3.5 3 8 3s8-1 8-3" />
          <path d="M12 6v1" />
        </svg>
      );
    case 'saude': return <HeartPulse {...iconProps} />;
    case 'educacao': return <GraduationCap {...iconProps} />;
    case 'transporte': return <Car {...iconProps} />;
    case 'combustivel': return <Fuel {...iconProps} />;
    case 'imprevistos': return <AlertTriangle {...iconProps} />;
    case 'pets': return <PawPrint {...iconProps} />;
    case 'comer-fora': return <UtensilsCrossed {...iconProps} />;
    case 'assinaturas': return <Tv {...iconProps} />;
    case 'vestuario-acessorios': return <Shirt {...iconProps} />;
    case 'cuidados-pessoais': return <Smile {...iconProps} />;
    case 'investimentos-aplicacoes': return <Sprout {...iconProps} />;
    case 'dividas-emprestimos': return <CreditCard {...iconProps} />;
    case 'impostos-taxas': return <Receipt {...iconProps} />;
    case 'seguros': return <ShieldCheck {...iconProps} />;
    case 'doacoes': return <HeartHandshake {...iconProps} />;
    case 'loteria': return <Sparkles {...iconProps} />;
    case 'ajuste': return <Wrench {...iconProps} />;
    case 'compras': return <ShoppingBag {...iconProps} />;
    case 'ferias': return <Palmtree {...iconProps} />;
    case 'estorno': return <Undo2 {...iconProps} />;
    case 'outras-receitas': return <ArrowUpCircle {...iconProps} />;
    case 'outros-gastos': return <ArrowDownCircle {...iconProps} />;
    case 'transferencia': return <ArrowLeftRight {...iconProps} />;
    default: return <Tag {...iconProps} />;
  }
}
