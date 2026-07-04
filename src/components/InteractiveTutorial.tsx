import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Sparkles, 
  Plus, 
  TrendingUp, 
  BookOpen, 
  TrendingDown, 
  FolderHeart, 
  Search, 
  CloudLightning,
  Check,
  CheckCircle2,
  AlertCircle,
  Database,
  AlertTriangle,
  PiggyBank,
  Wallet,
  Calendar,
  ArrowRightLeft,
  Palette,
  Info,
  List
} from 'lucide-react';
import { ViewType } from '../types';

interface TutorialStep {
  title: string;
  subtitle: string;
  view: ViewType;
  description: string;
  icon: React.ReactNode;
  highlightId?: string; // CSS ID selector to highlight
  isSimulation?: boolean; // Whether this step is an interactive simulation
}

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onAddSimulatedLancamento: (desc: string, tipo: 'receita' | 'despesa', valor: number) => void;
  isAddModalOpen?: boolean;
  onToggleAddModal?: (open: boolean) => void;
}

export function InteractiveTutorial({
  isOpen,
  onClose,
  currentView,
  onChangeView,
  onAddSimulatedLancamento,
  isAddModalOpen = false,
  onToggleAddModal
}: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [simDesc, setSimDesc] = useState<string>('Almoço com Amigos');
  const [simTipo, setSimTipo] = useState<'receita' | 'despesa'>('despesa');
  const [simValor, setSimValor] = useState<string>('42.50');
  const [simSuccess, setSimSuccess] = useState<boolean>(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState<boolean>(false);
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Check if we need to show the welcome prompt (first-time user)
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      const hasSeen = localStorage.getItem('fluc_tutorial_shown_or_skipped');
      if (!hasSeen) {
        setShowWelcomePrompt(true);
      } else {
        setShowWelcomePrompt(false);
      }
    }
  }, [isOpen]);

  const steps: TutorialStep[] = [
    {
      title: "Boas-vindas ao Fluc!",
      subtitle: "Seu Novo Controle Financeiro Inteligente",
      view: "dashboard",
      icon: <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />,
      description: "Olá! O Fluc foi desenhado para ser o seu controle financeiro ideal, focado em facilidade, privacidade e agilidade total. Vamos fazer um tour guiado rápido por todos os recursos do sistema!",
    },
    {
      title: "Backup e Restauração",
      subtitle: "Salve e Recupere Localmente",
      view: "configuracoes",
      icon: <Database className="w-8 h-8 text-amber-500" />,
      description: "Se preferir manter seus dados offline e sob seu total controle, você pode exportar um arquivo JSON com todas as suas informações para o computador ou celular e restaurá-las a qualquer momento na seção de Backup e Restauração.",
      highlightId: "config-backup-restauracao"
    },
    {
      title: "Apagar Dados",
      subtitle: "Zere seu Aplicativo com Facilidade",
      view: "configuracoes",
      icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
      description: "Caso queira recomeçar, nesta seção você pode apagar apenas os lançamentos de transações (mantendo suas contas e categorias) ou realizar uma exclusão extrema, limpando todas as customizações e zerando o aplicativo.",
      highlightId: "config-apagar-dados"
    },
    {
      title: "Criação de contas e cartões",
      subtitle: "Organize seus Meios de Pagamento",
      view: "contas_cartoes",
      icon: <Wallet className="w-8 h-8 text-emerald-500" />,
      description: "Na aba de Contas e Cartões, você pode gerenciar todas as suas contas bancárias físicas (onde os saldos são recalculados a cada transação) e cadastrar seus cartões de crédito configurando limites, datas de vencimento e fechamento.",
      highlightId: "contas-cartoes-container"
    },
    {
      title: "Criação de Reservas e Cofrinhos",
      subtitle: "Guarde Dinheiro para seus Objetivos",
      view: "reservas_cofrinhos",
      icon: <PiggyBank className="w-8 h-8 text-pink-500" />,
      description: "Crie metas de economia, reservas de emergência ou cofrinhos personalizados. Você pode depositar valores diretamente das suas contas bancárias, registrar retiradas e acompanhar o percentual de progresso visual de forma prática.",
      highlightId: "reservas-cofrinhos-container"
    },
    {
      title: "Visão Geral & Saldo Disponível",
      subtitle: "Saldo Consolidado, Projeções e Reservas",
      view: "dashboard",
      icon: <TrendingUp className="w-8 h-8 text-emerald-500" />,
      description: "De volta ao Painel Geral, no topo você visualiza:\n\n• Saldo em Contas: O dinheiro disponível somando todas as suas contas.\n• Previsão de Saldo: O saldo projetado para o fim do mês, considerando lançamentos futuros agendados.\n• Reservado: O valor total guardado em suas Metas e Cofrinhos, preservado para não ser gasto por engano.",
      highlightId: "dashboard-balance-card"
    },
    {
      title: "Controle Financeiro & Filtro Mensal",
      subtitle: "Navegação por Período",
      view: "dashboard",
      icon: <Calendar className="w-8 h-8 text-blue-500" />,
      description: "Use o seletor de mês para navegar entre períodos passados, presentes ou futuros. O Fluc recalcula automaticamente as projeções de saldo e exibe as transações que pertencem exclusivamente ao mês selecionado.",
      highlightId: "dashboard-month-selector"
    },
    {
      title: "Extrato Completo & Busca Inteligente",
      subtitle: "Pesquisa Abrangente Multimensal",
      view: "extrato",
      icon: <Search className="w-8 h-8 text-cyan-500" />,
      description: "No Extrato, você pode realizar buscas instantâneas por texto ou valor. Ativando a opção 'Todos os Meses', a busca ignora o filtro mensal e varre todo o seu histórico financeiro do passado ao futuro!",
      highlightId: "extrato-search-container"
    },
    {
      title: "Lista de Lançamentos",
      subtitle: "Histórico de Transações Detalhado",
      view: "extrato",
      icon: <List className="w-8 h-8 text-teal-500" />,
      description: "Aqui você acompanha o fluxo detalhado das transações. Cada lançamento mostra o valor, categoria, conta de origem, status de liquidação (pago/pendente) e se possui recorrência ativa.",
      highlightId: "extrato-transactions-list"
    },
    {
      title: "Alternância entre Contas e Cartões",
      subtitle: "Foco no seu Fluxo de Caixa",
      view: "dashboard",
      icon: <ArrowRightLeft className="w-8 h-8 text-purple-500" />,
      description: "Utilize o seletor rápido no painel principal para alternar a exibição entre o saldo total das suas Contas Bancárias e o limite consolidado das faturas de seus Cartões de Crédito.",
      highlightId: "dashboard-accounts-cards-tabs"
    },
    {
      title: "Registrando Receitas e Despesas",
      subtitle: "Adicione Novas Transações",
      view: "dashboard",
      icon: <Plus className="w-8 h-8 text-rose-500 animate-bounce" />,
      description: "Para registrar uma transação, clique no botão flutuante '+' no menu inferior (em dispositivos móveis) ou no botão '+' no topo direito (em computadores). É simples, rápido e intuitivo!",
      highlightId: "add-launch-btn-flexible"
    },
    {
      title: "Menu de Lançamentos - Tipo",
      subtitle: "Passo 1: Tipo da Transação",
      view: "dashboard",
      icon: <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />,
      description: "No menu de cadastro, selecione se a transação é uma Receita (entrada verde), Despesa (saída vermelha), despesa em Cartão de Crédito ou uma Transferência entre suas próprias contas cadastradas.",
      highlightId: "modal-type-tabs"
    },
    {
      title: "Menu de Lançamentos - Valor",
      subtitle: "Passo 2: Defina o Valor",
      view: "dashboard",
      icon: <TrendingUp className="w-8 h-8 text-emerald-500" />,
      description: "Insira o valor do lançamento neste campo. Você também pode marcar se a transação já foi Paga/Recebida (Efetivada) ou se é apenas uma previsão futura desativando o botão ao lado.",
      highlightId: "modal-value-input"
    },
    {
      title: "Menu de Lançamentos - Detalhes",
      subtitle: "Passo 3: Identificação e Frequência",
      view: "dashboard",
      icon: <BookOpen className="w-8 h-8 text-blue-500" />,
      description: "Preencha a descrição, escolha a categoria correspondente, a conta de pagamento e determine se a transação se repete (Fixo/Recorrente) ou se é parcelada em vários meses.",
      highlightId: "modal-desc-input"
    },
    {
      title: "Menu de Lançamentos - Confirmar",
      subtitle: "Passo 4: Salve sua Transação",
      view: "dashboard",
      icon: <Check className="w-8 h-8 text-teal-500" />,
      description: "Clique em Confirmar para registrar a transação! O Fluc recalcula instantaneamente os seus saldos, faturas e gráficos, garantindo que o aplicativo reflita seus dados sem recarregar a tela.",
      highlightId: "modal-confirm-button"
    },
    {
      title: "Categorias e Pastas",
      subtitle: "Classificação Inteligente",
      view: "categorias",
      icon: <FolderHeart className="w-8 h-8 text-pink-500" />,
      description: "Agrupar seus gastos em categorias é fundamental para uma análise detalhada. Crie e edite suas próprias categorias personalizadas com cores exclusivas para facilitar a leitura visual dos seus relatórios financeiros.",
      highlightId: "categorias-container"
    },
    {
      title: "Temas",
      subtitle: "Aparência Personalizada",
      view: "configuracoes",
      icon: <Palette className="w-8 h-8 text-violet-500" />,
      description: "Prefere um visual escuro ou claro? Você pode alternar o tema do Fluc de forma instantânea para se adequar ao ambiente, reduzindo o cansaço visual ou aproveitando uma interface limpa e minimalista.",
      highlightId: "config-themes-section"
    },
    {
      title: "Icone de Informações",
      subtitle: "Dicas Rápidas de Ajuda",
      view: "extrato",
      icon: <Info className="w-8 h-8 text-cyan-500" />,
      description: "Sempre que visualizar o ícone de informação 'ℹ️' ao lado dos recursos, clique nele para abrir explicações detalhadas sobre o funcionamento avançado daquela funcionalidade, como buscas multimensais ou cálculos de saldos.",
      highlightId: "info-trigger-button"
    },
    {
      title: "Tudo Pronto!",
      subtitle: "O Controle das suas Finanças na sua Mão",
      view: "dashboard",
      icon: <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />,
      description: "Parabéns! Você completou o tour de recursos do Fluc. Agora você tem em mãos a ferramenta perfeita para alcançar a independência financeira. Aproveite e comece a gerenciar suas finanças hoje mesmo!",
    }
  ];

  // Adjust view when step changes to guide the user in the actual screens
  useEffect(() => {
    if (isOpen && !showWelcomePrompt && currentStep >= 0 && currentStep < steps.length) {
      const targetView = steps[currentStep].view;
      if (currentView !== targetView) {
        onChangeView(targetView);
      }
    }
  }, [currentStep, isOpen, showWelcomePrompt]);

  // Synchronize Launch/Add Modal visibility based on active step highlightId
  useEffect(() => {
    if (!isOpen || showWelcomePrompt) return;

    const highlightId = steps[currentStep]?.highlightId;
    const isModalStep = !!(highlightId && highlightId.startsWith('modal-'));

    if (isModalStep) {
      if (onToggleAddModal && !isAddModalOpen) {
        onToggleAddModal(true);
      }
    } else {
      if (onToggleAddModal && isAddModalOpen) {
        onToggleAddModal(false);
      }
    }
  }, [currentStep, isOpen, showWelcomePrompt]);

  // Handle active spotlight element tracking
  useEffect(() => {
    if (!isOpen || showWelcomePrompt) {
      setHighlightRect(null);
      return;
    }

    const currentStepObj = steps[currentStep];
    const highlightId = currentStepObj?.highlightId;

    if (!highlightId) {
      setHighlightRect(null);
      return;
    }

    let intervalId: any;
    let attempts = 0;

    const findAndMeasure = () => {
      let resolvedId = highlightId;
      if (highlightId === 'add-launch-btn-flexible') {
        resolvedId = window.innerWidth < 768 ? 'mobile-bottom-fab' : 'fab-add-launch';
      }

      const element = document.getElementById(resolvedId);
      if (element) {
        // Scroll the element smoothly to center of viewport
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const updateRect = () => {
          const rect = element.getBoundingClientRect();
          setHighlightRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        };

        // Measure initially
        updateRect();

        // Listeners for position updates
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, { passive: true });

        return () => {
          window.removeEventListener('resize', updateRect);
          window.removeEventListener('scroll', updateRect);
        };
      }
      return null;
    };

    let cleanupListeners: (() => void) | null = null;

    // Wait and poll for view transition elements
    intervalId = setInterval(() => {
      attempts++;
      const cleanup = findAndMeasure();
      if (cleanup) {
        cleanupListeners = cleanup;
        clearInterval(intervalId);
      } else if (attempts > 30) {
        clearInterval(intervalId); // Stop after 3 seconds
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [currentStep, isOpen, showWelcomePrompt, currentView, isAddModalOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSimSuccess(false);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setSimSuccess(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('fluc_tutorial_shown_or_skipped', 'true');
    setShowWelcomePrompt(false);
    if (onToggleAddModal) {
      onToggleAddModal(false);
    }
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('fluc_tutorial_shown_or_skipped', 'true');
    setShowWelcomePrompt(false);
    if (onToggleAddModal) {
      onToggleAddModal(false);
    }
    onClose();
  };

  const handleSimulateAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(simValor);
    if (!simDesc || isNaN(val) || val <= 0) return;

    onAddSimulatedLancamento(simDesc, simTipo, val);
    setSimSuccess(true);
    setTimeout(() => {
      setSimSuccess(false);
    }, 4000);
  };

  if (!isOpen) return null;

  const isHighlightInUpperHalf = highlightRect
    ? (highlightRect.top + highlightRect.height / 2) < window.innerHeight / 2
    : false;

  return (
    <div className={`fixed inset-0 z-[999] flex ${
      highlightRect 
        ? (isHighlightInUpperHalf ? 'items-end pb-8 sm:pb-16' : 'items-start pt-8 sm:pt-16') 
        : 'items-center'
    } justify-center p-4 pointer-events-none transition-all duration-300`}>
      {/* Background Dim Backdrop with Spotlight Cutout */}
      {highlightRect ? (
        <>
          {/* Transparent click catcher to allow dismiss by clicking outside spotlight */}
          <div 
            className="fixed inset-0 bg-transparent z-[997] cursor-pointer pointer-events-auto" 
            onClick={handleSkip} 
          />
          {/* Glowing Animated Spotlight Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16
            }}
            exit={{ opacity: 0 }}
            className="fixed border-2 border-[var(--bg-secondary)] rounded-2xl z-[998] shadow-[0_0_0_9999px_rgba(0,0,0,0.65),_0_0_15px_rgba(255,255,255,0.4)] pointer-events-none"
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          />
        </>
      ) : (
        /* Regular Full Backdrop */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer z-[997] pointer-events-auto"
          onClick={handleSkip}
        />
      )}

      <AnimatePresence mode="wait">
        {showWelcomePrompt ? (
          /* Welcome/Prompt modal */
          <motion.div
            key="welcome-prompt"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] p-8 shadow-2xl z-[1000] text-center space-y-6 pointer-events-auto"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--bg-secondary)]/10 text-[var(--bg-secondary)] flex items-center justify-center mb-2">
              <Sparkles size={32} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-[var(--text-general)] tracking-tight">
                Seja muito bem-vindo ao Fluc!
              </h2>
              <p className="text-xs text-[var(--text-discreto)] leading-relaxed">
                Identificamos que esta é a sua primeira visita! Gostaria de fazer uma breve apresentação guiada de 2 minutos para conhecer todas as funcionalidades e começar a gerenciar suas finanças com facilidade?
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setShowWelcomePrompt(false)}
                className="w-full py-3.5 bg-[var(--bg-secondary)] hover:opacity-90 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-lg shadow-[var(--bg-secondary)]/20 flex items-center justify-center gap-2"
              >
                <Play size={14} className="fill-current" />
                <span>Iniciar Apresentação</span>
              </button>
              
              <button
                onClick={handleSkip}
                className="w-full py-3 bg-transparent hover:bg-[var(--bg-app)] text-[var(--text-discreto)] hover:text-[var(--text-general)] font-bold text-xs rounded-2xl transition-all border border-[var(--bg-tertiary)] cursor-pointer"
              >
                Pular e explorar sozinho
              </button>
            </div>
          </motion.div>
        ) : (
          /* Guided Tour Cards */
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-[32px] p-6 shadow-2xl z-[1000] space-y-5 pointer-events-auto animate-none"
          >
            {/* Step indicators / header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[var(--bg-secondary)] tracking-widest uppercase">
                Passo {currentStep + 1} de {steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="p-1 rounded-lg text-[var(--text-discreto)] hover:text-[var(--text-general)] transition-colors cursor-pointer"
                title="Pular Tutorial"
              >
                <X size={18} />
              </button>
            </div>

            {/* Icon & Title Group */}
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-[var(--bg-app)] border border-[var(--bg-tertiary)] rounded-2xl shrink-0">
                {steps[currentStep].icon}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[var(--text-general)] tracking-tight">
                  {steps[currentStep].title}
                </h3>
                <p className="text-[10px] text-[var(--text-discreto)] uppercase tracking-wider font-semibold">
                  {steps[currentStep].subtitle}
                </p>
              </div>
            </div>

            {/* Main Text Content */}
            <div className="text-xs text-[var(--text-discreto)] leading-relaxed space-y-3">
              <p className="whitespace-pre-line">{steps[currentStep].description}</p>
            </div>

            {/* Progress Dots Bar */}
            <div className="flex items-center justify-center gap-1 pt-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep ? 'w-4 bg-[var(--bg-secondary)]' : 'w-1.5 bg-[var(--bg-tertiary)]'
                  }`}
                />
              ))}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--bg-tertiary)]">
              <button
                disabled={currentStep === 0}
                onClick={handlePrev}
                className="px-4 py-2 text-[11px] font-extrabold text-[var(--text-discreto)] hover:text-[var(--text-general)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <button
                onClick={handleNext}
                className="px-5 py-2.5 bg-[var(--bg-secondary)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-[var(--bg-secondary)]/10"
              >
                <span>{currentStep === steps.length - 1 ? "Finalizar" : "Avançar"}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
