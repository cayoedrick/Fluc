import { useState, useEffect, useRef } from 'react';
import { FlucState, Conta, Cartao, Categoria, Lancamento, Cofrinho, CofrinhoHistorico } from '../types';
import { getDefaultState } from '../data/defaults';
import { auth } from '../lib/firebase';
import { subscribeToData, saveData } from '../services/db';

export function useFlucState() {
  const [state, setState] = useState<FlucState>(() => {
    const saved = localStorage.getItem('fluc_financial_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Make sure it has all required keys
        if (parsed.contas && parsed.cartoes && parsed.categorias && parsed.lancamentos && parsed.cofrinhos) {
          return {
            ...getDefaultState(),
            ...parsed,
            cofrinhoHistorico: parsed.cofrinhoHistorico || [],
            theme: parsed.theme || 'clean'
          };
        }
      } catch (e) {
        console.error('Error parsing saved Fluc state, using defaults', e);
      }
    }
    return getDefaultState();
  });

  const isSyncing = useRef(false);

  // Sync with Firestore when authenticated
  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToData('state', (remoteState) => {
      if (remoteState) {
        isSyncing.current = true;
        setState(prev => ({
          ...prev,
          ...remoteState,
          lastSyncDownload: new Date().toISOString()
        } as FlucState));
        setTimeout(() => { isSyncing.current = false; }, 100);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Save to localStorage and Firestore on change
  useEffect(() => {
    localStorage.setItem('fluc_financial_state', JSON.stringify(state));

    if (auth.currentUser && !isSyncing.current) {
      const stateToSave = { ...state, lastSyncUpload: new Date().toISOString() };
      saveData('state', stateToSave);
      
      // Request background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((swRegistration) => {
          return (swRegistration as any).sync.register('sync-financial-data');
        }).catch((err) => {
          console.error('[App] Background sync registration failed:', err);
        });
      }
    }
  }, [state]);

  // Helper to enrich state items with updatedAt timestamps when modified or created
  const enrichStateWithTimestamps = (prev: FlucState, next: FlucState): FlucState => {
    const collections: (keyof FlucState)[] = ['contas', 'cartoes', 'categorias', 'lancamentos', 'cofrinhos', 'cofrinhoHistorico'];
    const now = Date.now();
    const updatedCollections: Partial<FlucState> = {};
    let changed = false;

    for (const colKey of collections) {
      const prevList = (prev[colKey] || []) as any[];
      const nextList = (next[colKey] || []) as any[];

      if (prevList === nextList) {
        continue;
      }

      const prevMap = new Map<string, any>(prevList.map(item => [item.id, item]));
      const enrichedList = nextList.map(item => {
        const prevItem = prevMap.get(item.id);
        if (!prevItem) {
          changed = true;
          return { ...item, updatedAt: now };
        }

        const fieldsChanged = Object.keys(item).some(key => {
          if (key === 'updatedAt') return false;
          return (item as any)[key] !== (prevItem as any)[key];
        });

        if (fieldsChanged) {
          if (item.updatedAt && item.updatedAt !== prevItem.updatedAt) {
            return item;
          }
          changed = true;
          return { ...item, updatedAt: now };
        }

        return item;
      });

      updatedCollections[colKey] = enrichedList as any;
    }

    if (changed) {
      return {
        ...next,
        ...updatedCollections
      };
    }
    return next;
  };

  // Helper to update specific piece of state
  const updateState = (updater: Partial<FlucState> | ((prev: FlucState) => FlucState)) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return enrichStateWithTimestamps(prev, next);
    });
  };

  // Helper: check if a transaction date is in a given month and year (YYYY-MM)
  const isDateInMonthYear = (dateStr: string, monthYearStr: string) => {
    // dateStr: YYYY-MM-DD, monthYearStr: YYYY-MM
    return dateStr.startsWith(monthYearStr);
  };


  // ACCOUNT CALCULATIONS:
  // Account current balance is computed dynamically based on:
  // initial balance + received incomes - paid expenses - transfers out + transfers in - cofrinho deposits + cofrinho withdrawals
  const getAccountBalance = (contaId: string, upToDate?: string): number => {
    const conta = state.contas.find((c) => c.id === contaId);
    if (!conta) return 0;

    let balance = conta.saldoInicial;

    state.lancamentos.forEach((l) => {
      if (upToDate && l.data > upToDate) return;

      if (l.tipo === 'receita' && l.contaId === contaId && l.recebidoPagoEfetivado) {
        balance += l.valor;
      } else if (l.tipo === 'despesa' && l.contaId === contaId && l.recebidoPagoEfetivado) {
        balance -= l.valor;
      } else if (l.tipo === 'transferencia' && l.recebidoPagoEfetivado) {
        if (l.contaId === contaId) {
          balance -= l.valor; // "da conta"
        }
        if (l.paraContaId === contaId) {
          balance += l.valor; // "para conta"
        }
      }
    });

    // Handle cofrinho history deposits/withdrawals
    state.cofrinhoHistorico.forEach((h) => {
      if (upToDate && h.data > upToDate) return;

      if (h.contaId === contaId) {
        if (h.tipo === 'deposito') {
          balance -= h.valor; // Deposited from account to cofrinho
        } else if (h.tipo === 'retirada') {
          balance += h.valor; // Withdrawn from cofrinho back to account
        }
      }
    });

    return balance;
  };

  // TOTAL BALANCE: sum of all account current balances
  const getTotalBalance = (): number => {
    return state.contas.reduce((sum, c) => sum + getAccountBalance(c.id), 0);
  };

  // CARD INVOICE VALUES (for credit card invoice in selected month-year):
  // "os lançamentos nesta categoria (despesa_cartao) devem ser contabilizados a partir do mês seguinte à data do lançamento."
  // For a given card and target month-year (e.g. "2026-06"):
  // Sum card expenses listed in the same month-year as the invoice period.
  const getCardInvoiceValue = (cartaoId: string, monthYearStr: string): number => {
    const cartao = state.cartoes.find((c) => c.id === cartaoId);
    if (!cartao) return 0;

    let sum = 0;
    state.lancamentos.forEach((l) => {
      if (l.tipo === 'despesa_cartao' && l.cartaoId === cartaoId) {
        // Match the same month and year period (e.g. "2026-06")
        if (isDateInMonthYear(l.data, monthYearStr)) {
          if (l.estorno) {
            sum -= l.valor; // Refund/adjustment subtracts from invoice
          } else {
            sum += l.valor; // Standard charge adds to invoice
          }
        }
      }
    });

    return Math.max(0, sum);
  };

  // Total invoice value for ALL cards in a given month-year
  const getTotalInvoicesValue = (monthYearStr: string, activeCardFilterId?: string): number => {
    if (activeCardFilterId) {
      return getCardInvoiceValue(activeCardFilterId, monthYearStr);
    }
    return state.cartoes.reduce((sum, card) => sum + getCardInvoiceValue(card.id, monthYearStr), 0);
  };

  // SUM OF RESERVED VALUE
  const getTotalReservedValue = (): number => {
    return state.cofrinhos.reduce((sum, c) => sum + c.saldoAtual, 0);
  };

  // Month-Year calculations for Receipts and Expenses (specific to selected month-year)
  const getPeriodStats = (monthYearStr: string, accountId?: string, cartaoId?: string) => {
    let receitas = 0;
    let despesas = 0;

    state.lancamentos.forEach((l) => {
      if (!isDateInMonthYear(l.data, monthYearStr)) return;

      if (accountId) {
        // filter by bank account
        if (l.tipo === 'receita' && l.contaId === accountId && l.recebidoPagoEfetivado) {
          receitas += l.valor;
        } else if (l.tipo === 'despesa' && l.contaId === accountId && l.recebidoPagoEfetivado) {
          despesas += l.valor;
        }
      } else if (cartaoId) {
        // credit card specific stats inside the calendar month
        if (l.tipo === 'despesa_cartao' && l.cartaoId === cartaoId) {
          if (l.estorno) {
            despesas -= l.valor;
          } else {
            despesas += l.valor;
          }
        }
      } else {
        // total stats across all accounts and cards for that month (simple sum)
        if (l.tipo === 'receita' && l.recebidoPagoEfetivado) {
          receitas += l.valor;
        } else if (l.tipo === 'despesa' && l.recebidoPagoEfetivado) {
          despesas += l.valor;
        } else if (l.tipo === 'despesa_cartao') {
          // Add credit card expenses into total despesas as well for visual clarity
          if (l.estorno) {
            despesas -= l.valor;
          } else {
            despesas += l.valor;
          }
        }
      }
    });

    return { receitas, despesas };
  };

  // FORECAST CALCULATIONS (Previsão de Saldo):
  // "Ao clicar em Previsão de Saldo, abre um menu flutuante mostrando os valores considerados nos cálculos, separados por receitas, despesas e faturas."
  // Let's compute:
  // - Total Current Balance of Accounts
  // - Pending (uncompleted) Incomes in current month-year
  // - Pending (uncompleted) Expenses in current month-year
  // - Credit card invoices due in current month-year
  // Forecast = Current Balance + Pending Incomes - Pending Expenses - Credit card invoices
  const getSaldoMesAnterior = (monthYearStr: string, accountId?: string): number => {
    const currentMonthStart = `${monthYearStr}-01`;
    let balance = 0;

    if (accountId) {
      const conta = state.contas.find((c) => c.id === accountId);
      if (conta) balance = conta.saldoInicial;
    } else {
      balance = state.contas.reduce((sum, c) => sum + c.saldoInicial, 0);
    }

    state.lancamentos.forEach((l) => {
      if (l.data < currentMonthStart && l.recebidoPagoEfetivado) {
        if (accountId) {
          if (l.tipo === 'receita' && l.contaId === accountId) {
            balance += l.valor;
          } else if (l.tipo === 'despesa' && l.contaId === accountId) {
            balance -= l.valor;
          } else if (l.tipo === 'transferencia') {
            if (l.contaId === accountId) balance -= l.valor;
            if (l.paraContaId === accountId) balance += l.valor;
          }
        } else {
          if (l.tipo === 'receita') {
            balance += l.valor;
          } else if (l.tipo === 'despesa') {
            balance -= l.valor;
          }
        }
      }
    });

    state.cofrinhoHistorico.forEach((h) => {
      if (h.data < currentMonthStart) {
        if (accountId) {
          if (h.contaId === accountId) {
            if (h.tipo === 'deposito') {
              balance -= h.valor;
            } else if (h.tipo === 'retirada') {
              balance += h.valor;
            }
          }
        } else {
          if (h.tipo === 'deposito' && !h.isInitial) {
            balance -= h.valor;
          } else if (h.tipo === 'retirada') {
            balance += h.valor;
          }
        }
      }
    });

    return balance;
  };

  const getSaldoAtual = (monthYearStr: string, accountId?: string): number => {
    let balance = getSaldoMesAnterior(monthYearStr, accountId);

    state.lancamentos.forEach((l) => {
      if (l.data.startsWith(monthYearStr) && l.recebidoPagoEfetivado) {
        if (accountId) {
          if (l.tipo === 'receita' && l.contaId === accountId) {
            balance += l.valor;
          } else if (l.tipo === 'despesa' && l.contaId === accountId) {
            balance -= l.valor;
          } else if (l.tipo === 'transferencia') {
            if (l.contaId === accountId) balance -= l.valor;
            if (l.paraContaId === accountId) balance += l.valor;
          }
        } else {
          if (l.tipo === 'receita') {
            balance += l.valor;
          } else if (l.tipo === 'despesa') {
            balance -= l.valor;
          }
        }
      }
    });

    state.cofrinhoHistorico.forEach((h) => {
      if (h.data.startsWith(monthYearStr)) {
        if (accountId) {
          if (h.contaId === accountId) {
            if (h.tipo === 'deposito') {
              balance -= h.valor;
            } else if (h.tipo === 'retirada') {
              balance += h.valor;
            }
          }
        } else {
          if (h.tipo === 'deposito' && !h.isInitial) {
            balance -= h.valor;
          } else if (h.tipo === 'retirada') {
            balance += h.valor;
          }
        }
      }
    });

    return balance;
  };

  const getForecastData = (monthYearStr: string) => {
    const saldoMesAnterior = getSaldoMesAnterior(monthYearStr);
    
    let receitasConsolidadas = 0;
    let receitasPendentes = 0;
    let despesasConsolidadas = 0;
    let despesasPendentes = 0;

    state.lancamentos.forEach((l) => {
      if (!isDateInMonthYear(l.data, monthYearStr)) return;

      if (l.tipo === 'receita') {
        if (l.recebidoPagoEfetivado) {
          receitasConsolidadas += l.valor;
        } else {
          receitasPendentes += l.valor;
        }
      } else if (l.tipo === 'despesa') {
        if (l.recebidoPagoEfetivado) {
          despesasConsolidadas += l.valor;
        } else {
          despesasPendentes += l.valor;
        }
      }
    });

    const activeInvoices = getTotalInvoicesValue(monthYearStr);

    const forecast = saldoMesAnterior + receitasConsolidadas + receitasPendentes - despesasConsolidadas - despesasPendentes - activeInvoices;

    return {
      saldoMesAnterior,
      receitasConsolidadas,
      receitasPendentes,
      despesasConsolidadas,
      despesasPendentes,
      activeInvoices,
      forecast
    };
  };

  // BACKUP & RESTORE / DATA MUTATIONS
  const clearLancamentos = () => {
    updateState({ lancamentos: [] });
  };

  const resetAllData = () => {
    updateState(getDefaultState());
  };

  const eraseAllData = () => {
    const defaultState = getDefaultState();
    updateState({
      contas: [],
      cartoes: [],
      categorias: defaultState.categorias,
      lancamentos: [],
      cofrinhos: [],
      cofrinhoHistorico: []
    });
  };

  const importStateFromJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      // Validate structure roughly
      if (
        Array.isArray(parsed.contas) &&
        Array.isArray(parsed.cartoes) &&
        Array.isArray(parsed.categorias) &&
        Array.isArray(parsed.lancamentos) &&
        Array.isArray(parsed.cofrinhos)
      ) {
        updateState({
          contas: parsed.contas,
          cartoes: parsed.cartoes,
          categorias: parsed.categorias,
          lancamentos: parsed.lancamentos,
          cofrinhos: parsed.cofrinhos,
          cofrinhoHistorico: parsed.cofrinhoHistorico || [],
          theme: parsed.theme || 'clean'
        });
        return true;
      }
    } catch (e) {
      console.error('Failed to import JSON data', e);
    }
    return false;
  };

  return {
    state,
    updateState,
    getAccountBalance,
    getTotalBalance,
    getCardInvoiceValue,
    getTotalInvoicesValue,
    getTotalReservedValue,
    getPeriodStats,
    getForecastData,
    getSaldoMesAnterior,
    getSaldoAtual,
    clearLancamentos,
    resetAllData,
    eraseAllData,
    importStateFromJSON,
    isDateInMonthYear
  };
}
