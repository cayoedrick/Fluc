import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Users, Receipt, User, Layers, Info, Download, FileText, Image, FileCode, ChevronDown, Trash2, TrendingUp, UserPlus } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Lancamento } from '../types';

import { formatCurrency } from '../utils/currency';

interface SharedLancamentoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  allLancamentos?: Lancamento[];
  onDeleteLancamento?: (id: string, mode?: 'este' | 'futuros' | 'todos') => void;
  onAddLancamento?: (newLanc: Omit<Lancamento, 'id'>) => void;
  onEditLancamento?: (id: string, updatedFields: Partial<Lancamento>, mode?: 'este' | 'futuros' | 'todos') => void;
}

export function SharedLancamentoDetailsModal({
  isOpen,
  onClose,
  lancamento,
  allLancamentos = [],
  onDeleteLancamento,
  onAddLancamento,
  onEditLancamento
}: SharedLancamentoDetailsModalProps) {
  if (!lancamento) return null;

  // Check if it's a generated reimbursement by useFlucState (starts with reimb-)
  const isGeneratedReimbursement = lancamento.isReimbursement && lancamento.id.startsWith('reimb-');
  let combinedExpenses: Lancamento[] = [];
  let combinedParticipantName = '';
  
  if (isGeneratedReimbursement) {
    // Extract participant name from ID: reimb-{participantName}-{YYYY-MM}__contaId or reimb-{participantName}-{YYYY-MM}
    const baseId = lancamento.id.split('__')[0];
    const parts = baseId.split('-');
    if (parts.length >= 4) { // reimb-Nome-2023-10 or reimb-Nome-Sobrenome-2023-10
      combinedParticipantName = baseId.substring(6, baseId.length - 8);
      const monthYear = baseId.substring(baseId.length - 7);
      
      combinedExpenses = allLancamentos.filter(l => 
        !l.isReimbursement && 
        l.isShared && 
        l.data.startsWith(monthYear) &&
        l.participantes?.some(p => p.nome === combinedParticipantName)
      ).sort((a, b) => a.data.localeCompare(b.data));
    }
  }

  // Resolve the primary expense representation.
  const originalExpense = lancamento.isReimbursement && !isGeneratedReimbursement
    ? allLancamentos.find(l => l.id === lancamento.originalSharedLancamentoId)
    : lancamento;

  // targetLanc represents the primary expense we are inspecting
  const targetLanc = isGeneratedReimbursement ? (combinedExpenses[0] || lancamento) : (originalExpense || lancamento);

  // Find all parent expenses belonging to the same group
  const groupedLancamentos = isGeneratedReimbursement 
    ? combinedExpenses
    : (targetLanc.grupoId 
        ? allLancamentos
            .filter(l => l.grupoId === targetLanc.grupoId && !l.isReimbursement)
            .sort((a, b) => a.data.localeCompare(b.data))
        : []);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getMonthNamePortuguese = (dateStr: string) => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]} de ${year}`;
      }
    }
    return '';
  };

  const calculateShareValue = (valorTotal: number, p: { valor: number; isPorcentagem: boolean }) => {
    if (p.isPorcentagem) {
      return (valorTotal * (p.valor / 100));
    }
    return p.valor;
  };

  const getYourShare = (l: Lancamento) => {
    const participantsTotal = l.participantes?.reduce((acc, p) => acc + calculateShareValue(l.valor, p), 0) || 0;
    return l.valor - participantsTotal;
  };

  // Sum totals across all grouped entries for consolidated view
  const totalGroupValue = groupedLancamentos.reduce((acc, l) => acc + l.valor, 0);
  
  // Consolidate participant shares across all grouped entries
  const consolidatedParticipants: Record<string, { nome: string; totalValue: number }> = {};
  groupedLancamentos.forEach(l => {
    l.participantes?.forEach(p => {
      const val = calculateShareValue(l.valor, p);
      if (!consolidatedParticipants[p.nome]) {
        consolidatedParticipants[p.nome] = { nome: p.nome, totalValue: 0 };
      }
      consolidatedParticipants[p.nome].totalValue += val;
    });
  });

  const totalYourShare = groupedLancamentos.reduce((acc, l) => acc + getYourShare(l), 0);

  const exportContentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Lancamento | null>(null);
  const [deleteMode, setDeleteMode] = useState<'select' | 'new_participant'>('select');
  const [newParticipantName, setNewParticipantName] = useState<string>('');

  // Extract target participant name if deleting from a participant reimbursement view
  let targetParticipantName = combinedParticipantName;
  if (!targetParticipantName && lancamento.descricao.startsWith('Reembolso: ')) {
    const extracted = lancamento.descricao.substring('Reembolso: '.length).split(' - ')[0];
    if (extracted) targetParticipantName = extracted.trim();
  }

  const targetParticipantObj = (targetParticipantName && itemToDelete?.participantes)
    ? itemToDelete.participantes.find(p => p.nome.trim().toLowerCase() === targetParticipantName.trim().toLowerCase())
    : null;

  const activeQuotaVal = (targetParticipantObj && itemToDelete)
    ? calculateShareValue(itemToDelete.valor, targetParticipantObj)
    : (itemToDelete ? itemToDelete.valor : 0);

  const handleConfirmDistribute = () => {
    if (!itemToDelete) return;

    if (targetParticipantObj && onEditLancamento) {
      const otherParts = itemToDelete.participantes!.filter(
        p => p.nome.trim().toLowerCase() !== targetParticipantName.trim().toLowerCase()
      );

      if (otherParts.length > 0) {
        const addedPerP = activeQuotaVal / otherParts.length;
        const updatedParticipants = otherParts.map(p => {
          const currentVal = calculateShareValue(itemToDelete.valor, p);
          return {
            ...p,
            valor: Number((currentVal + addedPerP).toFixed(2)),
            isPorcentagem: false
          };
        });
        onEditLancamento(itemToDelete.id, { participantes: updatedParticipants }, 'este');
      } else {
        onEditLancamento(itemToDelete.id, { participantes: [] }, 'este');
      }

      window.showToast?.(`Cota de ${targetParticipantName} distribuída com sucesso!`, 'sucesso');
      setItemToDelete(null);
      setDeleteMode('select');
      if (groupedLancamentos.length <= 1) {
        onClose();
      }
      return;
    }

    const itemVal = itemToDelete.valor;
    const remainingExpenses = groupedLancamentos.filter(l => l.id !== itemToDelete.id);

    if (remainingExpenses.length > 0 && onEditLancamento) {
      const primary = remainingExpenses[0];
      const participants = primary.participantes || [];

      if (participants.length > 0) {
        const addedPerParticipant = itemVal / participants.length;
        const updatedParticipants = participants.map(p => {
          const currentVal = calculateShareValue(primary.valor, p);
          const newVal = Number((currentVal + addedPerParticipant).toFixed(2));
          return {
            ...p,
            valor: newVal,
            isPorcentagem: false
          };
        });

        onEditLancamento(primary.id, { participantes: updatedParticipants }, 'este');
      } else if (itemToDelete.participantes && itemToDelete.participantes.length > 0) {
        onEditLancamento(primary.id, { participantes: itemToDelete.participantes }, 'este');
      }
    }

    if (onDeleteLancamento) {
      onDeleteLancamento(itemToDelete.id, 'este');
    }

    window.showToast?.('Item excluído e valor distribuído entre os participantes!', 'sucesso');
    setItemToDelete(null);
    setDeleteMode('select');
    if (groupedLancamentos.length <= 1) {
      onClose();
    }
  };

  const handleConfirmReceita = () => {
    if (!itemToDelete) return;

    if (targetParticipantObj && onEditLancamento) {
      if (onAddLancamento) {
        onAddLancamento({
          tipo: 'receita',
          valor: activeQuotaVal,
          recebidoPagoEfetivado: true,
          data: itemToDelete.data,
          descricao: itemToDelete.descricao,
          categoriaId: itemToDelete.categoriaId,
          contaId: itemToDelete.contaId,
          updatedAt: Date.now()
        });
      }

      const otherParts = itemToDelete.participantes!.filter(
        p => p.nome.trim().toLowerCase() !== targetParticipantName.trim().toLowerCase()
      );
      onEditLancamento(itemToDelete.id, { participantes: otherParts }, 'este');

      window.showToast?.(`Lançamento de receita (${formatCurrency(activeQuotaVal)}) criado e cota removida!`, 'sucesso');
      setItemToDelete(null);
      setDeleteMode('select');
      if (groupedLancamentos.length <= 1) {
        onClose();
      }
      return;
    }

    if (onAddLancamento) {
      onAddLancamento({
        tipo: 'receita',
        valor: itemToDelete.valor,
        recebidoPagoEfetivado: true,
        data: itemToDelete.data,
        descricao: itemToDelete.descricao,
        categoriaId: itemToDelete.categoriaId,
        contaId: itemToDelete.contaId,
        updatedAt: Date.now()
      });
    }

    if (onDeleteLancamento) {
      onDeleteLancamento(itemToDelete.id, 'este');
    }

    window.showToast?.('Lançamento de receita criado e item excluído!', 'sucesso');
    setItemToDelete(null);
    setDeleteMode('select');
    if (groupedLancamentos.length <= 1) {
      onClose();
    }
  };

  const handleConfirmNewParticipant = () => {
    if (!itemToDelete || !newParticipantName.trim()) return;

    const pName = newParticipantName.trim();

    if (targetParticipantObj && onEditLancamento) {
      const otherParts = itemToDelete.participantes!.filter(
        p => p.nome.trim().toLowerCase() !== targetParticipantName.trim().toLowerCase()
      );

      const existingIndex = otherParts.findIndex(p => p.nome.trim().toLowerCase() === pName.toLowerCase());
      if (existingIndex >= 0) {
        const existing = otherParts[existingIndex];
        const existingVal = calculateShareValue(itemToDelete.valor, existing);
        otherParts[existingIndex] = {
          ...existing,
          valor: Number((existingVal + activeQuotaVal).toFixed(2)),
          isPorcentagem: false
        };
      } else {
        otherParts.push({
          nome: pName,
          valor: activeQuotaVal,
          isPorcentagem: false
        });
      }

      onEditLancamento(itemToDelete.id, { participantes: otherParts }, 'este');

      window.showToast?.(`Cota transferida para o participante "${pName}"!`, 'sucesso');
      setItemToDelete(null);
      setDeleteMode('select');
      setNewParticipantName('');
      if (groupedLancamentos.length <= 1) {
        onClose();
      }
      return;
    }

    const itemVal = itemToDelete.valor;
    const remainingExpenses = groupedLancamentos.filter(l => l.id !== itemToDelete.id);

    if (remainingExpenses.length > 0 && onEditLancamento) {
      const primary = remainingExpenses[0];
      const currentParts = primary.participantes ? [...primary.participantes] : [];
      
      const existingIndex = currentParts.findIndex(p => p.nome.toLowerCase() === pName.toLowerCase());
      if (existingIndex >= 0) {
        const existing = currentParts[existingIndex];
        const existingVal = calculateShareValue(primary.valor, existing);
        currentParts[existingIndex] = {
          ...existing,
          valor: Number((existingVal + itemVal).toFixed(2)),
          isPorcentagem: false
        };
      } else {
        currentParts.push({
          nome: pName,
          valor: itemVal,
          isPorcentagem: false
        });
      }

      onEditLancamento(primary.id, { participantes: currentParts }, 'este');
    } else if (onEditLancamento) {
      const currentParts = targetLanc.participantes ? [...targetLanc.participantes] : [];
      currentParts.push({
        nome: pName,
        valor: itemVal,
        isPorcentagem: false
      });
      onEditLancamento(targetLanc.id, { participantes: currentParts }, 'este');
    }

    if (onDeleteLancamento) {
      onDeleteLancamento(itemToDelete.id, 'este');
    }

    window.showToast?.(`Novo participante "${pName}" criado e item excluído!`, 'sucesso');
    setItemToDelete(null);
    setDeleteMode('select');
    setNewParticipantName('');
    if (groupedLancamentos.length <= 1) {
      onClose();
    }
  };

  const handleConfirmSimpleDelete = () => {
    if (!itemToDelete) return;

    if (targetParticipantObj && onEditLancamento) {
      const otherParts = itemToDelete.participantes!.filter(
        p => p.nome.trim().toLowerCase() !== targetParticipantName.trim().toLowerCase()
      );
      onEditLancamento(itemToDelete.id, { participantes: otherParts }, 'este');

      window.showToast?.(`Cota de ${targetParticipantName} removida!`, 'sucesso');
      setItemToDelete(null);
      setDeleteMode('select');
      if (groupedLancamentos.length <= 1) {
        onClose();
      }
      return;
    }

    if (onDeleteLancamento) {
      onDeleteLancamento(itemToDelete.id, 'este');
    }

    window.showToast?.('Lançamento excluído com sucesso!', 'sucesso');
    setItemToDelete(null);
    setDeleteMode('select');
    if (groupedLancamentos.length <= 1) {
      onClose();
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getExportBackgroundColor = () => {
    if (!exportContentRef.current) return '#1b2a2f';
    const computedBg = window.getComputedStyle(exportContentRef.current).backgroundColor;
    if (computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)') {
      return computedBg;
    }
    return document.body.classList.contains('theme-clean') ? '#fdfefe' : '#1b2a2f';
  };

  const handleExportPNG = async () => {
    if (!exportContentRef.current) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);
    try {
      const bg = getExportBackgroundColor();
      const dataUrl = await toPng(exportContentRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      });
      triggerDownload(dataUrl, `detalhamento_compartilhado_${targetLanc.id}.png`);
      window.showToast?.('Detalhamento exportado em PNG com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
      try {
        const bg = getExportBackgroundColor();
        const dataUrl = await toPng(exportContentRef.current, {
          quality: 0.9,
          pixelRatio: 1.5,
          backgroundColor: bg,
        });
        triggerDownload(dataUrl, `detalhamento_compartilhado_${targetLanc.id}.png`);
        window.showToast?.('Detalhamento exportado em PNG com sucesso!', 'sucesso');
      } catch (fallbackErr) {
        console.error('Erro no fallback do PNG:', fallbackErr);
        window.showToast?.('Erro ao gerar imagem PNG.', 'erro');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!exportContentRef.current) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);
    try {
      const bg = getExportBackgroundColor();
      const dataUrl = await toPng(exportContentRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: bg,
        cacheBust: true,
      });

      const img = document.createElement('img');
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgWidth = img.width;
      const imgHeight = img.height;

      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth / 2, imgHeight / 2]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
      
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      triggerDownload(blobUrl, `detalhamento_compartilhado_${targetLanc.id}.pdf`);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      window.showToast?.('Detalhamento exportado em PDF com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      window.showToast?.('Erro ao gerar PDF.', 'erro');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOC = () => {
    setIsExportMenuOpen(false);
    try {
      const dateStr = formatDate(targetLanc.tipo === 'despesa_cartao' && targetLanc.dataCompra ? targetLanc.dataCompra : targetLanc.data);
      const totalVal = formatCurrency(targetLanc.valor);
      
      let participantsRows = '';
      if (targetLanc.participantes && targetLanc.participantes.length > 0) {
        participantsRows = targetLanc.participantes.map(p => {
          const val = calculateShareValue(targetLanc.valor, p);
          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.nome}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1;">${p.isPorcentagem ? `${p.valor}%` : formatCurrency(p.valor)}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #4f46e5;">${formatCurrency(val)}</td>
            </tr>
          `;
        }).join('');
      }

      const yourShareVal = formatCurrency(getYourShare(targetLanc));

      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Detalhamento do Lançamento Compartilhado</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { color: #4f46e5; margin: 0; font-size: 22px; }
            .header p { color: #64748b; margin: 4px 0 0 0; font-size: 13px; }
            .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
            .row { margin-bottom: 10px; font-size: 14px; }
            .label { font-weight: bold; color: #475569; width: 140px; display: inline-block; }
            .value { font-weight: bold; color: #0f172a; }
            .amount { font-size: 18px; color: #4f46e5; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #e0e7ff; color: #3730a3; padding: 10px; text-align: left; font-size: 12px; border: 1px solid #cbd5e1; }
            .summary { background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 14px; border-radius: 10px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Detalhamento do Lançamento Compartilhado</h1>
            <p>Relatório gerado pelo Hórus Monitoramento</p>
          </div>

          <div class="card">
            <div class="row"><span class="label">Descrição:</span> <span class="value">${targetLanc.descricao}</span></div>
            <div class="row"><span class="label">Data do Lançamento:</span> <span class="value">${dateStr}</span></div>
            <div class="row"><span class="label">Valor Total:</span> <span class="amount">${totalVal}</span></div>
          </div>

          ${targetLanc.participantes && targetLanc.participantes.length > 0 ? `
            <h3>Divisão entre Participantes</h3>
            <table>
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Fração / Porcentagem</th>
                  <th>Valor da Parte</th>
                </tr>
              </thead>
              <tbody>
                ${participantsRows}
              </tbody>
            </table>
            <div class="summary">
              <strong>${isGeneratedReimbursement ? 'Total a Receber:' : 'Sua Parte na Despesa:'}</strong> 
              <span class="amount" style="float: right;">${isGeneratedReimbursement ? formatCurrency(calculateShareValue(targetLanc.valor, targetLanc.participantes?.find(p => p.nome === combinedParticipantName) || { valor: 0, isPorcentagem: false })) : yourShareVal}</span>
            </div>
          ` : ''}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl, `detalhamento_compartilhado_${targetLanc.id}.doc`);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      window.showToast?.('Detalhamento exportado em .DOC com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao exportar DOC:', err);
      window.showToast?.('Erro ao gerar documento .DOC.', 'erro');
    }
  };

  const renderExpenseCard = (item: Lancamento, isSelected: boolean, isLinked: boolean, keyPrefix: string = 'card') => {
    const itemYourShare = getYourShare(item);
    const isCompact = isLinked;

    return (
      <div key={`${keyPrefix}-${item.id}`} className={`bg-[var(--bg-app)] ${isSelected && !isGeneratedReimbursement ? 'p-5 rounded-3xl border border-indigo-500 shadow-sm shadow-indigo-500/10 space-y-4' : 'p-4 rounded-2xl border border-[var(--bg-tertiary)] space-y-3'}`}>
        <div className={`flex items-center justify-between border-b border-[var(--bg-tertiary)] ${isCompact ? 'pb-2' : 'pb-3'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected && !isGeneratedReimbursement ? 'text-indigo-500' : 'text-[var(--text-discreto)]'}`}>
              {isLinked ? (item.tipo === 'receita' ? 'Receita Vinculada' : 'Despesa Vinculada') : 'Lançamento Selecionado'}
            </span>
            {lancamento.isReimbursement && isSelected && !isGeneratedReimbursement && (
              <span className="text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">
                Receita de Reembolso
              </span>
            )}
          </div>
          {onDeleteLancamento && !item.id.startsWith('reimb-') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setItemToDelete(item);
              }}
              title="Excluir este item especificamente"
              className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Excluir Item</span>
            </button>
          )}
        </div>

        <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
          <div className="flex items-start gap-2.5">
            <Receipt size={isCompact ? 14 : 16} className="text-[var(--text-discreto)] mt-0.5 shrink-0" />
            <div>
              <span className={`${isCompact ? 'text-xs' : 'text-sm'} font-bold text-[var(--text-general)] block leading-tight`}>
                {item.descricao}
              </span>
              <span className="text-[10px] text-[var(--text-discreto)] block mt-0.5">
                Data: {formatDate(item.tipo === 'despesa_cartao' && item.dataCompra ? item.dataCompra : item.data)}
              </span>
            </div>
          </div>

          <div className={`pt-2 border-t border-[var(--bg-tertiary)] flex justify-between items-baseline`}>
            <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">
              Valor Total
            </span>
            <span className={`${isCompact ? 'text-base' : 'text-xl'} font-black text-[var(--text-general)]`}>
              {formatCurrency(item.valor)}
            </span>
          </div>
        </div>

        {item.participantes && item.participantes.length > 0 && (
          <div className={`pt-3 border-t border-[var(--bg-tertiary)] ${isCompact ? 'space-y-2' : 'space-y-3'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={12} className="text-indigo-500" />
              <span className="text-[9px] font-bold text-[var(--text-discreto)] uppercase tracking-wider">
                Divisão
              </span>
            </div>
            
            <div className={isCompact ? 'space-y-1.5' : 'space-y-2'}>
              {item.participantes.map((p, idx) => {
                const shareValue = calculateShareValue(item.valor, p);
                const isThisReimbursementParticipant = 
                  (lancamento.isReimbursement && Math.abs(shareValue - lancamento.valor) < 0.01 && isSelected) ||
                  (isGeneratedReimbursement && p.nome === combinedParticipantName);

                return (
                  <div 
                    key={`part-${p.nome}-${idx}`} 
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isThisReimbursementParticipant 
                        ? 'bg-indigo-500/10 border-indigo-500/30' 
                        : 'bg-[var(--bg-primary)] border-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        isThisReimbursementParticipant ? 'bg-indigo-500 text-white shadow-xs' : 'bg-[var(--bg-app)] border border-[var(--bg-tertiary)] text-indigo-500'
                      }`}>
                        <User size={10} />
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold block leading-none ${isThisReimbursementParticipant ? 'text-indigo-500' : 'text-[var(--text-general)]'}`}>
                          {p.nome}
                          {isThisReimbursementParticipant && (
                            <span className="ml-1 text-[8px] uppercase tracking-tighter bg-indigo-500 text-white px-1 py-[1px] rounded-sm">
                              Atual
                            </span>
                          )}
                        </span>
                        <span className="text-[8px] text-[var(--text-discreto)]">
                          Fração: {p.isPorcentagem ? `${p.valor}%` : formatCurrency(p.valor)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-indigo-500">
                      {formatCurrency(shareValue)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={`p-2.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex justify-between items-center text-[10px] mt-2`}>
              <span className="font-semibold text-indigo-500">
                {isGeneratedReimbursement ? 'A Receber' : 'Sua parte'}
              </span>
              <span className="font-black text-indigo-500">
                {isGeneratedReimbursement
                  ? formatCurrency(calculateShareValue(item.valor, item.participantes?.find(p => p.nome === combinedParticipantName) || { valor: 0, isPorcentagem: false }))
                  : formatCurrency(itemYourShare)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header - Identical for both Expense and Revenue (Reimbursement) */}
            <div className="p-6 border-b border-[var(--bg-tertiary)] flex items-center justify-between bg-indigo-500/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Share2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-general)]">
                    Detalhes do Compartilhamento
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                    {groupedLancamentos.length > 1 ? 'Lançamento Agrupado' : targetLanc.tipo === 'receita' ? 'Reembolso Compartilhado' : 'Despesa Dividida'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-discreto)] cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div ref={exportContentRef} className="space-y-6 p-2 rounded-2xl bg-[var(--bg-primary)]">
                {isGeneratedReimbursement ? (
                  <div className="space-y-4">
                    {groupedLancamentos.map((item, idx) => renderExpenseCard(item, false, true, `gen-${idx}`))}
                  </div>
                ) : (
                  <>
                    {renderExpenseCard(targetLanc, true, false, 'target')}

                    {groupedLancamentos.length > 1 && lancamento.isReimbursement && (
                      <div className="space-y-4 pt-2">
                        {groupedLancamentos.filter(l => l.id !== targetLanc.id).map((item, idx) => renderExpenseCard(item, false, true, `linked-${idx}`))}
                      </div>
                    )}
                  </>
                )}

                {/* Grouped entries section totals */}
                {groupedLancamentos.length > 1 && lancamento.isReimbursement && (
                  <div className="p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-3">
                      <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        {isGeneratedReimbursement ? `Total a Receber de ${combinedParticipantName}` : 'Totais Consolidados do Grupo'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      {!isGeneratedReimbursement && (
                        <div className="flex justify-between items-center">
                          <span className="text-indigo-700 dark:text-indigo-300 font-medium">Valor Total do Grupo:</span>
                          <span className="font-black text-indigo-700 dark:text-indigo-300">
                            {formatCurrency(totalGroupValue)}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 py-2 border-y border-dashed border-indigo-500/20">
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">
                          {isGeneratedReimbursement ? 'Total das Despesas:' : 'Total por Participante:'}
                        </span>
                        {Object.values(consolidatedParticipants)
                          .filter(cp => !isGeneratedReimbursement || cp.nome === combinedParticipantName)
                          .map((cp, idx) => (
                          <div key={`cp-${cp.nome}-${idx}`} className="flex justify-between items-center">
                            <span className="text-indigo-700 dark:text-indigo-300 font-medium text-xs">{cp.nome}:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                              {formatCurrency(cp.totalValue)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-1 font-black text-indigo-700 dark:text-indigo-300">
                        <span>{isGeneratedReimbursement ? 'Total a Receber:' : 'Seu Total no Grupo:'}</span>
                        <span className="bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-xs font-bold">
                          {isGeneratedReimbursement ? formatCurrency(consolidatedParticipants[combinedParticipantName]?.totalValue || 0) : formatCurrency(totalYourShare)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Options Dropdown Menu */}
              <div className="relative pt-2">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={isExporting}
                  className="w-full py-3.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-bold text-xs rounded-2xl transition-all flex items-center justify-between border border-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Download size={16} />
                    <span>{isExporting ? 'Exportando...' : 'Exportar Detalhamento'}</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-2 left-0 right-0 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-2xl shadow-2xl overflow-hidden p-1.5 z-50 space-y-1"
                    >
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-indigo-500/10 text-left transition-colors cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-general)] block">Exportar para PDF (.pdf)</span>
                          <span className="text-[10px] text-[var(--text-discreto)]">Documento PDF formatado</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportPNG}
                        className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-indigo-500/10 text-left transition-colors cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <Image size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-general)] block">Exportar para Imagem (.png)</span>
                          <span className="text-[10px] text-[var(--text-discreto)]">Imagem de alta definição</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportDOC}
                        className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-indigo-500/10 text-left transition-colors cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          <FileCode size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-general)] block">Exportar para Word (.doc)</span>
                          <span className="text-[10px] text-[var(--text-discreto)]">Documento editável em Word</span>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-general)] font-bold text-xs rounded-2xl transition-all cursor-pointer border border-[var(--bg-tertiary)]"
              >
                Fechar Detalhes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Item Delete Confirmation Overlay */}
      {itemToDelete && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-red-500 border-b border-[var(--bg-tertiary)] pb-3">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-[var(--text-general)]">
                  {targetParticipantObj ? `Excluir Cota de ${targetParticipantName}` : 'Excluir Item Compartilhado'}
                </h4>
                <p className="text-xs text-[var(--text-discreto)]">
                  "{itemToDelete.descricao}"
                  {targetParticipantObj ? (
                    <span className="block text-[11px] text-indigo-500 font-semibold mt-0.5">
                      Cota de {targetParticipantName}: {formatCurrency(activeQuotaVal)} (Total do item: {formatCurrency(itemToDelete.valor)})
                    </span>
                  ) : (
                    ` (${formatCurrency(activeQuotaVal)})`
                  )}
                </p>
              </div>
            </div>

            {deleteMode === 'select' ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[var(--text-general)]">
                  O que você deseja fazer com {targetParticipantObj ? `a cota de ${targetParticipantName} (` : 'o valor de '}
                  <span className="font-bold text-indigo-500">{formatCurrency(activeQuotaVal)}</span>
                  {targetParticipantObj ? ')' : ''} ao excluí-la?
                </p>

                <div className="space-y-2.5 pt-1">
                  {/* Option 1: Distribuir entre participantes */}
                  <button
                    type="button"
                    onClick={handleConfirmDistribute}
                    className="w-full text-left p-3.5 rounded-2xl bg-[var(--bg-app)] hover:bg-indigo-500/10 border border-[var(--bg-tertiary)] hover:border-indigo-500/30 transition-all cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 shrink-0 group-hover:scale-105 transition-transform">
                      <Users size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-general)] block">Distribuir entre os participantes</span>
                      <span className="text-[10px] text-[var(--text-discreto)] block leading-snug mt-0.5">
                        Divide o valor ({formatCurrency(activeQuotaVal)}) entre os participantes restantes no grupo.
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Criar lançamento de receita */}
                  <button
                    type="button"
                    onClick={handleConfirmReceita}
                    className="w-full text-left p-3.5 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--bg-tertiary)] hover:border-emerald-500/30 transition-all cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0 group-hover:scale-105 transition-transform">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-general)] block">Criar Lançamento de Receita</span>
                      <span className="text-[10px] text-[var(--text-discreto)] block leading-snug mt-0.5">
                        Gera uma nova receita no valor de {formatCurrency(activeQuotaVal)}.
                      </span>
                    </div>
                  </button>

                  {/* Option 3: Criar um novo participante */}
                  <button
                    type="button"
                    onClick={() => setDeleteMode('new_participant')}
                    className="w-full text-left p-3.5 rounded-2xl bg-[var(--bg-app)] hover:bg-blue-500/10 border border-[var(--bg-tertiary)] hover:border-blue-500/30 transition-all cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shrink-0 group-hover:scale-105 transition-transform">
                      <UserPlus size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-general)] block">Criar Novo Participante</span>
                      <span className="text-[10px] text-[var(--text-discreto)] block leading-snug mt-0.5">
                        Atribui este valor ({formatCurrency(activeQuotaVal)}) a uma nova pessoa no reembolso.
                      </span>
                    </div>
                  </button>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[var(--bg-tertiary)]">
                  <button
                    type="button"
                    onClick={() => {
                      setItemToDelete(null);
                      setDeleteMode('select');
                    }}
                    className="flex-1 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-app)] text-[var(--text-general)] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSimpleDelete}
                    className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-[11px] rounded-xl transition-colors cursor-pointer border border-red-500/20"
                  >
                    Apenas Excluir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[var(--text-general)]">
                  Digite o nome do novo participante que assumirá o valor de <span className="font-bold text-indigo-500">{formatCurrency(activeQuotaVal)}</span>:
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block">
                    Nome do Participante
                  </label>
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Ex: João Silva"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-app)] border border-[var(--bg-tertiary)] text-xs text-[var(--text-general)] focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-[var(--bg-tertiary)]">
                  <button
                    type="button"
                    onClick={() => setDeleteMode('select')}
                    className="flex-1 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-app)] text-[var(--text-general)] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!newParticipantName.trim()}
                    onClick={handleConfirmNewParticipant}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Confirmar e Excluir
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
