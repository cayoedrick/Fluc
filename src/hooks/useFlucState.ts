import { useState, useEffect, useRef } from 'react';
import { FlucState, Conta, Cartao, Categoria, Lancamento, Cofrinho, CofrinhoHistorico } from '../types';
import { getDefaultState } from '../data/defaults';
import { auth } from '../lib/firebase';
import { subscribeToData, saveData } from '../services/db';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useFlucState() {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [state, setState] = useState<FlucState>(() => {
    const saved = localStorage.getItem('fluc_financial_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.contas && parsed.cartoes && parsed.categorias && parsed.lancamentos && parsed.cofrinhos) {
          return {
            ...getDefaultState(),
            ...parsed,
            cofrinhoHistorico: parsed.cofrinhoHistorico || [],
            deletedIds: parsed.deletedIds || [],
            theme: parsed.theme || 'clean'
          };
        }
      } catch (e) {
        console.error('Error parsing saved Fluc state, using defaults', e);
      }
    }
    return getDefaultState();
  });

  const skipNextSave = useRef(false);

  // Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Helper to merge local and remote states taking newest items by updatedAt
  const mergeStates = (local: FlucState, remote: FlucState): FlucState => {
    // 1. Combine deleted IDs (tombstones)
    const combinedDeletedIds = Array.from(new Set([
      ...(local.deletedIds || []),
      ...(remote.deletedIds || [])
    ]));

    // 2. Initialize merged state
    const merged: FlucState = { 
      ...local,
      deletedIds: combinedDeletedIds 
    };
    
    const collections: (keyof FlucState)[] = ['contas', 'cartoes', 'categorias', 'lancamentos', 'cofrinhos', 'cofrinhoHistorico'];

    for (const colKey of collections) {
      const localList = (local[colKey] || []) as any[];
      const remoteList = (remote[colKey] || []) as any[];

      const resultMap = new Map<string, any>();

      // Load remote items first
      remoteList.forEach(item => {
        if (item && item.id && !combinedDeletedIds.includes(item.id)) {
          resultMap.set(item.id, item);
        }
      });

      // Merge local items: prioritize local if newer OR if remote doesn't have it
      localList.forEach(localItem => {
        if (!localItem || !localItem.id || combinedDeletedIds.includes(localItem.id)) return;
        
        const remoteItem = resultMap.get(localItem.id);
        if (!remoteItem) {
          resultMap.set(localItem.id, localItem);
        } else {
          const localUpdate = localItem.updatedAt || 0;
          const remoteUpdate = remoteItem.updatedAt || 0;
          
          if (localUpdate > remoteUpdate) {
            resultMap.set(localItem.id, localItem);
          }
        }
      });

      (merged as any)[colKey] = Array.from(resultMap.values());
    }

    const localMod = local.lastModifiedAt || 0;
    const remoteMod = remote.lastModifiedAt || 0;
    
    if (remoteMod > localMod && remote.theme) {
      merged.theme = remote.theme;
    }
    
    merged.lastModifiedAt = Math.max(localMod, remoteMod);
    
    if (remoteMod >= localMod) {
      merged.lastSyncUpload = remote.lastSyncUpload;
    } else {
      merged.lastSyncUpload = local.lastSyncUpload;
    }
    
    return merged;
  };

  // Real-time Sync with Firestore
  useEffect(() => {
    if (!currentUser) return;

    // Real-time listener
    const unsubscribe = subscribeToData(currentUser.uid, 'state', (remoteState, isSyncing) => {
      setIsCloudSyncing(isSyncing);
      
      if (remoteState) {
        setState(prev => {
          const merged = mergeStates(prev, remoteState);
          
          // Check if remote data brought anything new OR if local data is still ahead
          const hasChanges = JSON.stringify(merged) !== JSON.stringify(prev);
          if (!hasChanges) return prev;

          const remoteMod = remoteState.lastModifiedAt || 0;
          const localMod = prev.lastModifiedAt || 0;

          if (localMod > remoteMod) {
            console.log(`[RTDB Sync] Merge: Local device has newer unsaved changes. Merging and preparing to re-upload.`);
          } else if (remoteMod > localMod) {
            console.log(`[RTDB Sync] Merge: Server has newer data. Updating local state.`);
          } else {
            console.log(`[RTDB Sync] Merge: Concurrent changes detected or timestamps matched. Merging lists.`);
          }

          // Important: We do NOT skipNextSave here anymore. 
          // If the merged state has localMod > merged.lastSyncUpload, 
          // the persistence effect will naturally trigger an upload to reconcile the server.
          return {
            ...merged,
            lastSyncDownload: Date.now()
          };
        });
      } else {
        console.log("[RTDB Sync] No remote state found for user. Initializing server if local data exists.");
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Persistence: Save to localStorage and RTDB on change
  useEffect(() => {
    localStorage.setItem('fluc_financial_state', JSON.stringify(state));

    if (currentUser) {
      const timeout = setTimeout(async () => {
        if (!currentUser) return;
        
        const lastMod = state.lastModifiedAt || 0;
        const lastUp = state.lastSyncUpload || 0;

        // Only upload if local modifications are newer than the last successful sync
        if (lastMod <= lastUp) return;

        const now = Date.now();
        const stateWithUpload = { ...state, lastSyncUpload: now };
        
        try {
          console.log(`[RTDB Sync] Syncing local changes to cloud... (LocalMod: ${lastMod}, LastUp: ${lastUp})`);
          await saveData(currentUser.uid, 'state', stateWithUpload);
          
          setState(prev => {
            const currentMod = prev.lastModifiedAt || 0;
            // If new changes happened during the async upload, don't overwrite lastSyncUpload blindly
            if (currentMod > lastMod) return prev; 
            
            return { ...prev, lastSyncUpload: now };
          });
          console.log("[RTDB Sync] Cloud sync complete.");
        } catch (e) {
          console.error("[RTDB Sync] Cloud sync failed:", e);
        }
      }, 1500); // Increased debounce to 1.5s for stability

      return () => clearTimeout(timeout);
    }
  }, [state, currentUser]);

  // Periodic 5-second sanity check for unsaved local changes
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      if (document.hidden) return;

      setState(prev => {
        const lastMod = prev.lastModifiedAt || 0;
        const lastUp = prev.lastSyncUpload || 0;
        
        if (lastMod > lastUp) {
          const now = Date.now();
          const stateWithUpload = { ...prev, lastSyncUpload: now };
          console.log("[RTDB Sync] Periodic sanity check: pushing unsaved local changes.");
          saveData(currentUser.uid, 'state', stateWithUpload).catch(err => console.error("[RTDB Sync] Periodic upload failed", err));
          return stateWithUpload;
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const syncSharedExpenses = (lancamentos: Lancamento[]): Lancamento[] => {
    // 1. Remove all generated reimbursement entries
    const baseLancamentos = lancamentos.filter(l => !l.isReimbursement);
    
    // 2. Identify shared expenses and calculate totals per participant per month
    // Map key: participantName + '|' + YYYY-MM
    const sharesMap = new Map<string, { total: number, descriptions: string[], date: string }>();
    
    baseLancamentos.forEach(l => {
      if (l.isShared && l.participantes && l.participantes.length > 0) {
        const monthYear = l.data.substring(0, 7); // YYYY-MM
        
        l.participantes.forEach(p => {
          if (!p.nome.trim()) return;
          const key = `${p.nome}|${monthYear}`;
          const current = sharesMap.get(key) || { total: 0, descriptions: [], date: l.data };
          
          let shareValue = p.valor;
          if (p.isPorcentagem) {
            shareValue = Number((l.valor * (p.valor / 100)).toFixed(2));
          }
          
          current.total = Number((current.total + shareValue).toFixed(2));
          current.descriptions.push(l.descricao);
          sharesMap.set(key, current);
        });
      }
    });
    
    // 3. Create reimbursement income entries
    const reimbursements: Lancamento[] = [];
    const now = Date.now();
    sharesMap.forEach((data, key) => {
      const [participantName, monthYear] = key.split('|');
      const logicalId = `reimb-${participantName}-${monthYear}`;
      
      // Try to find if this reimbursement already exists to preserve its status
      const existing = lancamentos.find(l => l.id === logicalId);
      const isPaid = existing ? existing.recebidoPagoEfetivado : false;
      
      const description = data.descriptions.length === 1 
        ? `${participantName} - ${data.descriptions[0]}`
        : `${participantName} - Variados`;
        
      reimbursements.push({
        id: logicalId,
        tipo: 'receita',
        valor: data.total,
        recebidoPagoEfetivado: isPaid,
        data: `${monthYear}-01`, // Set to 1st of the month for grouping
        descricao: description,
        isReimbursement: true,
        updatedAt: now
      });
    });
    
    return [...baseLancamentos, ...reimbursements];
  };

  // Helper to enrich state items with updatedAt timestamps when modified or created
  const enrichStateWithTimestamps = (prev: FlucState, next: FlucState): FlucState => {
    const collections: (keyof FlucState)[] = ['contas', 'cartoes', 'categorias', 'lancamentos', 'cofrinhos', 'cofrinhoHistorico'];
    const now = Date.now();
    const updatedCollections: Record<string, any> = {};
    let changed = false;
    
    // Tombstone management
    let newDeletedIds = Array.from(new Set([
      ...(prev.deletedIds || []),
      ...(next.deletedIds || [])
    ]));
    
    // If an item is explicitly present in the next state (e.g. via restore), remove it from tombstones
    const allNextIds = new Set([
      ...(next.contas || []).map(i => i.id),
      ...(next.cartoes || []).map(i => i.id),
      ...(next.categorias || []).map(i => i.id),
      ...(next.lancamentos || []).map(i => i.id),
      ...(next.cofrinhos || []).map(i => i.id)
    ]);
    newDeletedIds = newDeletedIds.filter(id => !allNextIds.has(id));

    let deletedChanged = newDeletedIds.length !== (prev.deletedIds || []).length;

    for (const colKey of collections) {
      const prevList = (prev[colKey] || []) as any[];
      const nextList = (next[colKey] || []) as any[];

      if (prevList === nextList) {
        continue;
      }

      // Detect deletions
      const nextIds = new Set(nextList.map(item => item.id));
      prevList.forEach(item => {
        if (!nextIds.has(item.id) && !newDeletedIds.includes(item.id)) {
          newDeletedIds.push(item.id);
          deletedChanged = true;
          changed = true;
        }
      });

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
          // If updatedAt was already updated by some other logic, keep it
          if (item.updatedAt && prevItem.updatedAt && item.updatedAt > prevItem.updatedAt) {
            return item;
          }
          changed = true;
          return { ...item, updatedAt: now };
        }

        return item;
      });

      updatedCollections[colKey] = enrichedList as any;
    }

    if (changed || deletedChanged) {
      return {
        ...next,
        ...updatedCollections,
        deletedIds: newDeletedIds,
        lastModifiedAt: now
      };
    }
    return next;
  };

  // Helper to update specific piece of state
  const updateState = (updater: Partial<FlucState> | ((prev: FlucState) => FlucState)) => {
    setState((prev) => {
      let next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      
      // Auto-sync shared expenses if lancamentos were modified
      if (next.lancamentos !== prev.lancamentos) {
        next = {
          ...next,
          lancamentos: syncSharedExpenses(next.lancamentos)
        };
      }
      
      return enrichStateWithTimestamps(prev, next);
    });
  };

  // Helper: check if a transaction date is in a given month and year (YYYY-MM)
  const isDateInMonthYear = (dateStr: string, monthYearStr: string) => {
    // dateStr: YYYY-MM-DD, monthYearStr: YYYY-MM
    return dateStr.startsWith(monthYearStr);
  };

  // DYNAMIC COFRINHO BALANCES: re-calculate cofrinho balances based on paid transactions & yields
  const cofrinhosWithBalances = state.cofrinhos.map(c => {
    let baseValue = c.valorInicial;
    if (baseValue === undefined) {
      // Deduce it: subtract currently matched transactions and yields from c.saldoAtual
      let transactionSum = 0;
      state.lancamentos.forEach(l => {
        if (l.cofrinhoId === c.id || (!l.cofrinhoId && (l.tipo === 'deposito_cofrinho' || l.tipo === 'retirada_cofrinho') && l.descricao.includes(c.nome))) {
          if (l.tipo === 'deposito_cofrinho') {
            transactionSum += l.valor;
          } else if (l.tipo === 'retirada_cofrinho') {
            transactionSum -= l.valor;
          }
        }
      });
      let yieldSum = 0;
      state.cofrinhoHistorico.forEach(h => {
        if (h.cofrinhoId === c.id) {
          if (h.tipo === 'rendimento_adicionar' || h.tipo === 'rendimento_atualizar') {
            yieldSum += h.valor;
          }
        }
      });
      baseValue = c.saldoAtual - transactionSum - yieldSum;
    }

    // Dynamic Balance: baseValue + paid deposits - paid withdrawals + yields
    let balance = baseValue;
    state.lancamentos.forEach(l => {
      if (l.recebidoPagoEfetivado) {
        if (l.cofrinhoId === c.id || (!l.cofrinhoId && (l.tipo === 'deposito_cofrinho' || l.tipo === 'retirada_cofrinho') && l.descricao.includes(c.nome))) {
          if (l.tipo === 'deposito_cofrinho') {
            balance += l.valor;
          } else if (l.tipo === 'retirada_cofrinho') {
            balance -= l.valor;
          }
        }
      }
    });

    state.cofrinhoHistorico.forEach(h => {
      if (h.cofrinhoId === c.id) {
        if (h.tipo === 'rendimento_adicionar' || h.tipo === 'rendimento_atualizar') {
          balance += h.valor;
        }
      }
    });

    return {
      ...c,
      saldoAtual: Number(balance.toFixed(2))
    };
  });

  const derivedState: FlucState = {
    ...state,
    cofrinhos: cofrinhosWithBalances
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

      if ((l.tipo === 'receita' || l.tipo === 'retirada_cofrinho') && l.contaId === contaId && l.recebidoPagoEfetivado) {
        balance += l.valor;
      } else if ((l.tipo === 'despesa' || l.tipo === 'deposito_cofrinho') && l.contaId === contaId && l.recebidoPagoEfetivado) {
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
    return cofrinhosWithBalances.reduce((sum, c) => sum + c.saldoAtual, 0);
  };

  // Month-Year calculations for Receipts and Expenses (specific to selected month-year)
  const getPeriodStats = (monthYearStr: string, accountId?: string, cartaoId?: string) => {
    let receitas = 0;
    let despesas = 0;

    state.lancamentos.forEach((l) => {
      if (!isDateInMonthYear(l.data, monthYearStr)) return;

      if (accountId) {
        // filter by bank account
        if ((l.tipo === 'receita' || l.tipo === 'retirada_cofrinho') && l.contaId === accountId && l.recebidoPagoEfetivado) {
          receitas += l.valor;
        } else if ((l.tipo === 'despesa' || l.tipo === 'deposito_cofrinho') && l.contaId === accountId && l.recebidoPagoEfetivado) {
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
        if ((l.tipo === 'receita' || l.tipo === 'retirada_cofrinho') && l.recebidoPagoEfetivado) {
          receitas += l.valor;
        } else if ((l.tipo === 'despesa' || l.tipo === 'deposito_cofrinho') && l.recebidoPagoEfetivado) {
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
    if (!accountId) {
      return state.contas.reduce((sum, c) => sum + getSaldoMesAnterior(monthYearStr, c.id), 0);
    }

    const currentMonthStart = `${monthYearStr}-01`;
    let balance = 0;

    const conta = state.contas.find((c) => c.id === accountId);
    if (conta) balance = conta.saldoInicial;

    state.lancamentos.forEach((l) => {
      if (l.data < currentMonthStart && l.recebidoPagoEfetivado) {
        if ((l.tipo === 'receita' || l.tipo === 'retirada_cofrinho') && l.contaId === accountId) {
          balance += l.valor;
        } else if ((l.tipo === 'despesa' || l.tipo === 'deposito_cofrinho') && l.contaId === accountId) {
          balance -= l.valor;
        } else if (l.tipo === 'transferencia') {
          if (l.contaId === accountId) balance -= l.valor;
          if (l.paraContaId === accountId) balance += l.valor;
        }
      }
    });

    return balance;
  };

  const getSaldoAtual = (monthYearStr: string, accountId?: string): number => {
    if (!accountId) {
      return state.contas.reduce((sum, c) => sum + getSaldoAtual(monthYearStr, c.id), 0);
    }

    let balance = getSaldoMesAnterior(monthYearStr, accountId);

    state.lancamentos.forEach((l) => {
      if (l.data.startsWith(monthYearStr) && l.recebidoPagoEfetivado) {
        if ((l.tipo === 'receita' || l.tipo === 'retirada_cofrinho') && l.contaId === accountId) {
          balance += l.valor;
        } else if ((l.tipo === 'despesa' || l.tipo === 'deposito_cofrinho') && l.contaId === accountId) {
          balance -= l.valor;
        } else if (l.tipo === 'transferencia') {
          if (l.contaId === accountId) balance -= l.valor;
          if (l.paraContaId === accountId) balance += l.valor;
        }
      }
    });

    return balance;
  };

  const getForecastData = (monthYearStr: string, accountId?: string) => {
    const saldoMesAnterior = getSaldoMesAnterior(monthYearStr, accountId);
    const saldoAtual = getSaldoAtual(monthYearStr, accountId);
    
    let receitasConsolidadas = 0;
    let receitasPendentes = 0;
    let despesasConsolidadas = 0;
    let despesasPendentes = 0;

    state.lancamentos.forEach((l) => {
      if (!isDateInMonthYear(l.data, monthYearStr)) return;

      if (l.tipo === 'receita' || l.tipo === 'retirada_cofrinho') {
        if (!accountId || l.contaId === accountId) {
          if (l.recebidoPagoEfetivado) {
            receitasConsolidadas += l.valor;
          } else {
            receitasPendentes += l.valor;
          }
        }
      } else if (l.tipo === 'despesa' || l.tipo === 'deposito_cofrinho') {
        if (!accountId || l.contaId === accountId) {
          if (l.recebidoPagoEfetivado) {
            despesasConsolidadas += l.valor;
          } else {
            despesasPendentes += l.valor;
          }
        }
      } else if (l.tipo === 'transferencia') {
        if (accountId) {
          if (l.contaId === accountId) { // Outflow
            if (l.recebidoPagoEfetivado) {
              despesasConsolidadas += l.valor;
            } else {
              despesasPendentes += l.valor;
            }
          }
          if (l.paraContaId === accountId) { // Inflow
            if (l.recebidoPagoEfetivado) {
              receitasConsolidadas += l.valor;
            } else {
              receitasPendentes += l.valor;
            }
          }
        }
      }
    });

    let activeInvoices = 0;
    if (!accountId) {
      activeInvoices = getTotalInvoicesValue(monthYearStr);
    } else {
      const linkedCards = state.cartoes.filter(c => c.contaVinculadaId === accountId);
      linkedCards.forEach((card) => {
        activeInvoices += getCardInvoiceValue(card.id, monthYearStr);
      });
    }

    // outrasMovimentacoes represent transfers and cofrinho history within this month
    const outrasMovimentacoes = saldoAtual - (saldoMesAnterior + receitasConsolidadas - despesasConsolidadas);

    const forecast = saldoAtual + receitasPendentes - despesasPendentes - activeInvoices;

    return {
      saldoMesAnterior,
      receitasConsolidadas,
      receitasPendentes,
      despesasConsolidadas,
      despesasPendentes,
      activeInvoices,
      outrasMovimentacoes,
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
        const now = Date.now();
        // Freshen timestamps so imported data takes precedence over cloud data
        const freshen = (arr: any[]) => arr.map(item => ({ ...item, updatedAt: now }));

        updateState({
          contas: freshen(parsed.contas),
          cartoes: freshen(parsed.cartoes),
          categorias: freshen(parsed.categorias),
          lancamentos: freshen(parsed.lancamentos),
          cofrinhos: freshen(parsed.cofrinhos),
          cofrinhoHistorico: freshen(parsed.cofrinhoHistorico || []),
          deletedIds: parsed.deletedIds || [],
          theme: parsed.theme || 'clean',
          lastModifiedAt: now
        });
        
        return true;
      }
    } catch (e) {
      console.error('Failed to import JSON data', e);
    }
    return false;
  };

  return {
    state: derivedState,
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
    isDateInMonthYear,
    isCloudSyncing,
    forceSync: async () => {
      if (!currentUser) return;
      const now = Date.now();
      const stateWithUpload = { ...state, lastSyncUpload: now, lastModifiedAt: now };
      try {
        await saveData(currentUser.uid, 'state', stateWithUpload);
        setState(stateWithUpload);
        return true;
      } catch (e) {
        console.error("Force sync failed", e);
        return false;
      }
    }
  };
}
