import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Users, Receipt, User, Layers, Info, Download, FileText, Image, FileCode, ChevronDown, Trash2, TrendingUp, UserPlus, QrCode, Landmark, Check, Copy } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Lancamento, Conta } from '../types';
import { generatePixPayload } from '../utils/pix';

import { formatCurrency } from '../utils/currency';

interface SharedLancamentoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  allLancamentos?: Lancamento[];
  contas?: Conta[];
  onDeleteLancamento?: (id: string, mode?: 'este' | 'futuros' | 'todos') => void;
  onAddLancamento?: (newLanc: Omit<Lancamento, 'id'>) => void;
  onEditLancamento?: (id: string, updatedFields: Partial<Lancamento>, mode?: 'este' | 'futuros' | 'todos') => void;
}

export function SharedLancamentoDetailsModal({
  isOpen,
  onClose,
  lancamento,
  allLancamentos = [],
  contas = [],
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
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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

  // PIX & Account State for Export
  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [customPixKey, setCustomPixKey] = useState<string>('');
  const [includePixInExport, setIncludePixInExport] = useState<boolean>(true);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string>('');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  // Auto-select initial account with PIX key when opening modal
  useEffect(() => {
    if (isOpen && contas.length > 0) {
      const contaWithPix = contas.find(c => c.chavePix && c.chavePix.trim().length > 0);
      const defaultConta = contaWithPix || contas.find(c => c.isMain) || contas[0];
      if (defaultConta) {
        setSelectedContaId(defaultConta.id);
        setCustomPixKey(defaultConta.chavePix || '');
        setIncludePixInExport(!!defaultConta.chavePix);
      }
    }
  }, [isOpen, contas]);

  const handleSelectConta = (contaId: string) => {
    setSelectedContaId(contaId);
    const selected = contas.find(c => c.id === contaId);
    if (selected) {
      setCustomPixKey(selected.chavePix || '');
      if (selected.chavePix) {
        setIncludePixInExport(true);
      }
    }
  };

  // Extract target participant name if deleting or filtering for a participant reimbursement view
  let targetParticipantName = combinedParticipantName;
  if (!targetParticipantName && lancamento.descricao.startsWith('Reembolso: ')) {
    const extracted = lancamento.descricao.substring('Reembolso: '.length).split(' - ')[0];
    if (extracted) targetParticipantName = extracted.trim();
  }

  // Formatted items list for export statement (excluding other participants)
  const itemsToExport = isGeneratedReimbursement
    ? (combinedExpenses.length > 0 ? combinedExpenses : [lancamento])
    : (groupedLancamentos.length > 0 ? groupedLancamentos : [targetLanc]);

  const exportItemsFormatted = itemsToExport.map(item => {
    let itemVal = item.valor;
    if (isGeneratedReimbursement && combinedParticipantName) {
      const part = item.participantes?.find(p => p.nome === combinedParticipantName);
      if (part) {
        itemVal = calculateShareValue(item.valor, part);
      }
    } else if (!isGeneratedReimbursement && targetParticipantName) {
      const part = item.participantes?.find(p => p.nome.trim().toLowerCase() === targetParticipantName.trim().toLowerCase());
      if (part) {
        itemVal = calculateShareValue(item.valor, part);
      }
    }
    return {
      id: item.id,
      descricao: item.descricao,
      data: item.tipo === 'despesa_cartao' && item.dataCompra ? item.dataCompra : item.data,
      valor: itemVal
    };
  });

  const exportTotalVal = exportItemsFormatted.reduce((acc, i) => acc + i.valor, 0);
  const selectedContaObj = contas.find(c => c.id === selectedContaId);

  // Generate PIX payload & QR code whenever PIX settings change
  useEffect(() => {
    if (!includePixInExport || !customPixKey.trim()) {
      setPixQrCodeUrl('');
      setPixPayload('');
      return;
    }

    const payload = generatePixPayload({
      chave: customPixKey.trim(),
      valor: exportTotalVal,
      nomeRecebedor: selectedContaObj?.nome || 'HORUS',
      descricao: targetLanc.descricao
    });

    setPixPayload(payload);

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then(url => setPixQrCodeUrl(url))
      .catch(err => {
        console.error('Erro ao gerar QR Code PIX:', err);
        setPixQrCodeUrl('');
      });
  }, [customPixKey, includePixInExport, exportTotalVal, selectedContaObj, targetLanc.descricao]);

  const handleCopyPixPayload = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    window.showToast?.('Código PIX Copia e Cola copiado para a área de transferência!', 'sucesso');
    setTimeout(() => setCopiedPix(false), 2500);
  };

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

  const handleExportPNG = async () => {
    if (!exportContentRef.current) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);
    try {
      const dataUrl = await toPng(exportContentRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      triggerDownload(dataUrl, `extrato_compartilhado_${targetLanc.id}.png`);
      window.showToast?.('Extrato exportado em PNG com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
      try {
        const dataUrl = await toPng(exportContentRef.current, {
          quality: 0.9,
          pixelRatio: 1.5,
          backgroundColor: '#ffffff',
        });
        triggerDownload(dataUrl, `extrato_compartilhado_${targetLanc.id}.png`);
        window.showToast?.('Extrato exportado em PNG com sucesso!', 'sucesso');
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
      const dataUrl = await toPng(exportContentRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
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
        orientation: 'portrait',
        unit: 'px',
        format: [imgWidth / 2, imgHeight / 2]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);

      // Embed selectable text layer for Chave PIX and PIX Copia e Cola into the PDF document
      if (includePixInExport && exportContentRef.current) {
        const container = exportContentRef.current;
        const containerRect = container.getBoundingClientRect();

        if (customPixKey) {
          const keyEl = container.querySelector('[data-pix-key-text]') as HTMLElement | null;
          if (keyEl) {
            const rect = keyEl.getBoundingClientRect();
            const relX = rect.left - containerRect.left;
            const relY = rect.top - containerRect.top;
            pdf.setFont('courier', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(15, 23, 42);
            pdf.text(customPixKey, relX, relY + 9);
          }
        }

        if (pixPayload) {
          const payloadEl = container.querySelector('[data-pix-payload-text]') as HTMLElement | null;
          if (payloadEl) {
            const rect = payloadEl.getBoundingClientRect();
            const relX = rect.left - containerRect.left;
            const relY = rect.top - containerRect.top;
            const relWidth = rect.width;

            pdf.setFont('courier', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(15, 23, 42);
            pdf.text(pixPayload, relX + 8, relY + 10, { maxWidth: relWidth - 16 });
          }
        }
      }
      
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      triggerDownload(blobUrl, `extrato_compartilhado_${targetLanc.id}.pdf`);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      window.showToast?.('Extrato exportado em PDF com sucesso!', 'sucesso');
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
      const itemsRows = exportItemsFormatted.map(item => `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-[13px] font-weight: 600;">${item.descricao}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-[13px] color: #64748b;">${formatDate(item.data)}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-[13px] font-weight: bold; text-align: right; color: #0f172a;">${formatCurrency(item.valor)}</td>
        </tr>
      `).join('');

      const pixHtml = (includePixInExport && customPixKey) ? `
        <div style="margin-top: 24px; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; text-align: center;">
          <h3 style="color: #15803d; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">DADOS PARA PAGAMENTO VIA PIX</h3>
          ${selectedContaObj ? `<p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #334155;">Conta Bancária: ${selectedContaObj.nome}</p>` : ''}
          ${pixQrCodeUrl ? `<div style="margin: 12px 0;"><img src="${pixQrCodeUrl}" width="180" height="180" alt="QR Code PIX" /></div>` : ''}
          <div style="background-color: #ffffff; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-block; margin-top: 6px;">
            <p style="font-family: monospace; font-size: 13px; font-weight: bold; color: #0f172a; margin: 0;">Chave PIX: ${customPixKey}</p>
          </div>
          ${pixPayload ? `
            <div style="background-color: #ffffff; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 10px; text-align: left;">
              <p style="font-size: 10px; font-weight: bold; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase;">Código PIX Copia e Cola (Para colar no App do Banco):</p>
              <p style="font-family: monospace; font-size: 9px; font-weight: bold; color: #0f172a; margin: 0; word-break: break-all; background-color: #f8fafc; padding: 6px; border-radius: 4px;">${pixPayload}</p>
            </div>
          ` : ''}
          <p style="font-size: 11px; color: #64748b; margin: 10px 0 0 0;">Escaneie o QR Code ou copie o código PIX acima para realizar o pagamento de <strong>${formatCurrency(exportTotalVal)}</strong>.</p>
        </div>
      ` : '';

      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Extrato Detalhado de Lançamento Compartilhado</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { color: #4f46e5; margin: 0; font-size: 20px; font-weight: bold; }
            .header p { color: #64748b; margin: 4px 0 0 0; font-size: 12px; }
            .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f1f5f9; color: #475569; padding: 10px; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #cbd5e1; }
            .total-row { background-color: #eef2ff; font-weight: bold; font-size: 14px; }
            .total-row td { padding: 12px; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HÓRUS MONITORAMENTO — EXTRATO DETALHADO</h1>
            <p>Emissão: ${formatDate(new Date().toISOString().split('T')[0])}</p>
          </div>

          <div class="card">
            <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Lançamento</p>
            <h2 style="margin: 4px 0 0 0; font-size: 16px; color: #0f172a; font-weight: bold;">${targetLanc.descricao}</h2>
            ${combinedParticipantName ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4f46e5; font-weight: bold;">Participante: ${combinedParticipantName}</p>` : ''}
          </div>

          <h3>Itens do Extrato</h3>
          <table>
            <thead>
              <tr>
                <th>Item / Descrição</th>
                <th>Data</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2" style="color: #334155;">VALOR TOTAL</td>
                <td style="text-align: right; color: #4f46e5;">${formatCurrency(exportTotalVal)}</td>
              </tr>
            </tfoot>
          </table>

          ${pixHtml}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl, `extrato_compartilhado_${targetLanc.id}.doc`);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      window.showToast?.('Extrato exportado em .DOC com sucesso!', 'sucesso');
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
            {/* Header */}
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

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-6">
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

              {/* Export Config Box: Conta Bancária & PIX key selection */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-[#00cc52]" />
                    <span className="text-xs font-bold text-[var(--text-general)] uppercase tracking-wider">
                      Pagamento via PIX no Extrato
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-[var(--text-discreto)]">
                    <input
                      type="checkbox"
                      checked={includePixInExport}
                      onChange={(e) => setIncludePixInExport(e.target.checked)}
                      className="accent-[#00cc52] rounded-md cursor-pointer"
                    />
                    <span>Incluir QR Code</span>
                  </label>
                </div>

                {includePixInExport && (
                  <div className="space-y-3 pt-1 border-t border-emerald-500/10">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">
                        Conta Bancária
                      </label>
                      <div className="relative flex items-center">
                        <Landmark size={14} className="absolute left-3 text-[var(--text-discreto)] pointer-events-none" />
                        <select
                          value={selectedContaId}
                          onChange={(e) => handleSelectConta(e.target.value)}
                          className="w-full py-2 pl-9 pr-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-xl text-xs text-[var(--text-general)] font-medium focus:outline-hidden"
                        >
                          <option value="">-- Nenhuma / Digitar PIX Manual --</option>
                          {contas.map(c => (
                            <option key={`conta-option-${c.id}`} value={c.id}>
                              {c.nome} {c.chavePix ? `(PIX: ${c.chavePix})` : '(Sem PIX cadastrado)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-discreto)] uppercase tracking-wider block mb-1">
                        Chave PIX Cadastrada / Para Recebimento
                      </label>
                      <input
                        type="text"
                        placeholder="Informe o CPF, e-mail, telefone ou chave aleatória"
                        value={customPixKey}
                        onChange={(e) => setCustomPixKey(e.target.value)}
                        className="w-full py-2 px-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-xl text-xs text-[var(--text-general)] font-mono focus:outline-hidden"
                      />
                    </div>

                    {pixQrCodeUrl && (
                      <div className="flex items-center gap-3 p-2.5 bg-[var(--bg-app)] border border-emerald-500/20 rounded-xl">
                        <img src={pixQrCodeUrl} alt="Preview QR Code PIX" className="w-14 h-14 bg-white p-1 rounded-lg shrink-0 border border-slate-200" />
                        <div className="text-[11px] leading-tight min-w-0 flex-1">
                          <span className="font-bold text-[#00cc52] block">QR Code gerado para o extrato</span>
                          <span className="text-[10px] text-[var(--text-discreto)] block mt-0.5">
                            Valor total: <strong className="text-[var(--text-general)]">{formatCurrency(exportTotalVal)}</strong>
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-general)] truncate block mt-0.5 max-w-[200px]">
                            {customPixKey}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Export Options Dropdown Menu */}
              <div className="relative pt-1">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={isExporting}
                  className="w-full py-3.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-bold text-xs rounded-2xl transition-all flex items-center justify-between border border-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Download size={16} />
                    <span>{isExporting ? 'Exportando Extrato...' : 'Exportar Extrato Detalhado'}</span>
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
                          <span className="text-[10px] text-[var(--text-discreto)]">Extrato detalhado com itens e QR Code PIX</span>
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
                          <span className="text-[10px] text-[var(--text-discreto)]">Imagem do extrato formatado</span>
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
                          <span className="text-[10px] text-[var(--text-discreto)]">Documento editável com dados de pagamento</span>
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

      {/* Hidden / Offscreen template container captured for PNG and PDF exports */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', overflow: 'hidden' }}>
        <div
          ref={exportContentRef}
          className="w-[600px] p-8 bg-white font-sans space-y-6 rounded-none shadow-none"
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
        >
          {/* Header */}
          <div className="border-b-2 border-indigo-600 pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-black text-indigo-600 tracking-tight">
                HÓRUS MONITORAMENTO
              </h1>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Extrato Detalhado de Lançamento Compartilhado
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-widest">Emissão</span>
              <span className="text-xs font-bold text-slate-700">{formatDate(new Date().toISOString().split('T')[0])}</span>
            </div>
          </div>

          {/* Title & Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Lançamento</span>
            <h2 className="text-base font-extrabold text-slate-800 leading-snug">{targetLanc.descricao}</h2>
            {combinedParticipantName && (
              <p className="text-xs font-semibold text-indigo-600">
                Participante: {combinedParticipantName}
              </p>
            )}
          </div>

          {/* Table of Items - Without other participants */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Itens do Lançamento</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600">
                  <th className="py-2.5 px-3">Item / Descrição</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {exportItemsFormatted.map((item, idx) => (
                  <tr key={`exp-item-${item.id}-${idx}`}>
                    <td className="py-2.5 px-3 font-semibold">{item.descricao}</td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(item.data)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800 text-sm font-extrabold bg-slate-50">
                  <td colSpan={2} className="py-3 px-3 text-slate-800 uppercase tracking-wider">Valor Total</td>
                  <td className="py-3 px-3 text-right text-indigo-600 text-base font-black">{formatCurrency(exportTotalVal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* PIX Payment Section at bottom */}
          {includePixInExport && customPixKey && (
            <div className="mt-6 pt-5 border-t-2 border-dashed border-emerald-300 bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 text-center space-y-3">
              <div className="text-emerald-800 font-black text-xs uppercase tracking-widest">
                Dados para Pagamento via PIX
              </div>

              {selectedContaObj && (
                <p className="text-xs font-bold text-slate-700">
                  Conta Bancária: <span className="text-emerald-700 font-extrabold">{selectedContaObj.nome}</span>
                </p>
              )}

              {pixQrCodeUrl && (
                <div className="p-3 bg-white inline-block rounded-2xl border border-slate-200 shadow-xs my-1">
                  <img src={pixQrCodeUrl} alt="QR Code PIX" className="w-40 h-40 object-contain mx-auto" />
                </div>
              )}

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 max-w-md mx-auto">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Chave PIX</span>
                <span data-pix-key-text className="font-mono font-black text-xs text-slate-900 select-all">{customPixKey}</span>
              </div>

              {pixPayload && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 max-w-md mx-auto text-left space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    PIX Copia e Cola (Código para Aplicativo do Banco)
                  </span>
                  <p data-pix-payload-text className="font-mono text-[9px] text-slate-800 break-all select-all font-semibold leading-tight bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {pixPayload}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-600 font-medium max-w-sm mx-auto leading-relaxed">
                Escaneie o QR Code ou copie o código <strong>PIX Copia e Cola</strong> acima pelo aplicativo do seu banco para pagar o valor de <strong className="text-slate-900 font-black">{formatCurrency(exportTotalVal)}</strong>.
              </p>
            </div>
          )}

          {/* Document footer watermark */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>Hórus Monitoramento Financeiro</span>
            <span>Documento Oficial de Cobrança</span>
          </div>
        </div>
      </div>

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
