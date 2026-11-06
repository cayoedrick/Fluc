import { Lancamento } from '../types';

/**
 * Checks if a transaction is an installment (parcelado)
 */
export function isLancamentoParcelado(l: Lancamento): boolean {
  if (!l) return false;
  if (l.parcelado) return true;
  if (typeof l.numParcelas === 'number' && l.numParcelas > 1) return true;
  if (l.grupoId && (/\(\d+\/\d+\)/.test(l.descricao) || /\(Parcela\s+\d+\/\d+\)/i.test(l.descricao))) return true;
  if (/\(\d+\/\d+\)/.test(l.descricao) || /\(Parcela\s+\d+\/\d+\)/i.test(l.descricao)) return true;
  return false;
}

/**
 * Adds N months to a YYYY-MM-DD date string preserving day of month
 */
export function addMonthsToDateStr(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetMonthIndex = month - 1 + monthsToAdd;
  const targetDate = new Date(year, targetMonthIndex, 1);
  const maxDayInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const finalDay = Math.min(day, maxDayInTargetMonth);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(finalDay)}`;
}

/**
 * Subtracts N months from a YYYY-MM-DD date string preserving day of month
 */
export function subtractMonthsFromDateStr(dateStr: string, monthsToSub: number): string {
  if (!dateStr) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetMonthIndex = month - 1 - monthsToSub;
  const targetDate = new Date(year, targetMonthIndex, 1);
  const maxDayInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const finalDay = Math.min(day, maxDayInTargetMonth);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(finalDay)}`;
}

/**
 * Gets the primary/initial date for a transaction.
 * For parcelados: always returns the primary date referring to the month that started (e.g. 2025-05-02),
 * preserving it regardless of which month or year is being viewed.
 * For single credit card purchases: returns dataCompra if present, else data.
 * For other transactions: returns data.
 */
export function getLancamentoPrimaryDate(l: Lancamento, allLancamentos?: Lancamento[]): string {
  if (!l) return '';

  if (isLancamentoParcelado(l)) {
    // 1. If dataCompra is already explicitly set, it is the primary date!
    if (l.dataCompra) {
      return l.dataCompra;
    }

    // 2. If part of a group and allLancamentos is provided, lookup the group's earliest/first installment
    if (l.grupoId && allLancamentos && allLancamentos.length > 0) {
      const groupItems = allLancamentos.filter(item => item.grupoId === l.grupoId);
      if (groupItems.length > 0) {
        // Look for item explicitly marked with first installment "(1/"
        const first = groupItems.find(item => item.descricao.includes('(1/') || item.descricao.toLowerCase().includes('(parcela 1/'))
          || groupItems.reduce((earliest, cur) => cur.data < earliest.data ? cur : earliest);
        if (first) {
          const resolved = first.dataCompra || first.data;
          if (resolved) return resolved;
        }
      }
    }

    // 3. Mathematical fallback: extract (X/Y) from description and backtrack (X-1) months from l.data
    const match = l.descricao.match(/\((\d+)\/(\d+)\)/) || l.descricao.match(/\(Parcela\s+(\d+)\/(\d+)\)/i);
    if (match) {
      const currentParcela = parseInt(match[1], 10);
      if (currentParcela > 1 && l.data) {
        return subtractMonthsFromDateStr(l.data, currentParcela - 1);
      }
    }

    return l.data;
  }

  // Single credit card purchase (shows date of purchase)
  if (l.tipo === 'despesa_cartao' && l.dataCompra) {
    return l.dataCompra;
  }

  return l.data;
}

/**
 * Gets the sorting date for a transaction in the month filter.
 * For parcelados, l.data represents its actual competence/occurrence in the filtered month (e.g. 2027-10-02),
 * ensuring it stays at its correct chronological day (e.g. day 02) among all transactions of that month.
 * For single credit card purchases: returns dataCompra.
 * For others: returns data.
 */
export function getLancamentoSortDate(l: Lancamento): string {
  if (!l) return '';

  if (isLancamentoParcelado(l)) {
    // Keeps installment in exact chronological order by day within the month (e.g. 2027-10-02)
    return l.data;
  }

  if (l.tipo === 'despesa_cartao' && l.dataCompra) {
    return l.dataCompra;
  }

  return l.data;
}

/**
 * Formats YYYY-MM-DD into DD/MM/YYYY for display
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.split('-').reverse().join('/');
}
