export const parseCurrencyInput = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Number(val.toFixed(2));
  }
  if (typeof val !== 'string') return 0;

  let cleaned = val.trim().replace(/R\$\s?|[\s]/g, '');
  if (!cleaned) return 0;

  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = cleaned.replace(/\./g, '');
    } else if (parts.length === 2) {
      if (parts[1].length === 3 && parts[0].length >= 1) {
        cleaned = cleaned.replace('.', '');
      }
    }
  }

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Number(parsed.toFixed(2));
};

export const formatCurrency = (val: number): string => {
  const safeVal = isNaN(val) || val === undefined || val === null ? 0 : val;
  return safeVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
