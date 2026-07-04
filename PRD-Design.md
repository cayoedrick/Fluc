# Product Requirements Document (PRD) - Fluc

## 1. Visão Geral do Produto
**Nome do Aplicativo:** Fluc - Controle Financeiro Pessoal
**Descrição:** Um aplicativo de controle financeiro moderno, minimalista e completo. Focado na experiência do usuário (UX), operando de forma 100% offline e local no navegador do usuário, garantindo total privacidade dos dados através da utilização do `LocalStorage`.

## 2. Princípios de Design e UX
- **Minimalismo e Clareza:** O design prioriza a ausência de distrações. O uso de bordas planas (`flat borders`) em vez de sombras (shadows) traz uma interface mais limpa e contemporânea.
- **Hierarquia Visual:** Uso estratégico de tipografia para diferenciar cabeçalhos de dados técnicos. 
- **Feedback Visual:** Botões e cartões possuem transições suaves ao passar o mouse ou clicar, oferecendo micro-interações sem exageros.
- **Mobile-First / Responsividade:** A interface foi construída com adaptação nativa para telas de dispositivos móveis, garantindo áreas de toque (touch targets) confortáveis e navegação fluida em qualquer resolução.
- **Modos de Visualização (Temas):** O aplicativo oferece uma alternância suave entre dois temas cuidadosamente desenhados para reduzir a fadiga visual, adequando-se às preferências do usuário: Tema Escuro (Dark) e Tema Claro (Clean).

## 3. Tipografia
As fontes escolhidas combinam um visual moderno para a interface geral e precisão para dados financeiros.
- **Fonte Primária (Geral):** `Outfit` (sans-serif) - Utilizada para menus, textos informativos, botões e cabeçalhos. Transmite um aspecto contemporâneo e acolhedor.
- **Fonte Secundária (Dados e Valores):** `JetBrains Mono` (monospace) - Utilizada para exibição de valores monetários, datas e dados técnicos. Facilita a leitura e o alinhamento numérico.

## 4. Guia de Cores (Paleta Hexadecimal)

### Cores Semânticas (Comuns a ambos os temas)
Estas cores indicam ações ou naturezas específicas de transações, garantindo o rápido reconhecimento visual independente do tema.
- **Receita (Verde):** `#00cc52` - Entradas, saldos positivos.
- **Despesa (Vermelho):** `#d03c4d` - Saídas, despesas, saldos negativos.
- **Transferência (Azul):** `#1c7ae4` - Movimentações neutras entre contas.
- **Cartão de Crédito (Laranja):** `#ed793a` - Gastos em cartão de crédito e faturas.

### Tema Escuro (Dark Theme)
Focado em conforto visual para ambientes de baixa luminosidade, utilizando tons profundos de azul/ardósia (slate/teal) em vez do preto absoluto.
- **Fundo do App (`--bg-app`):** `#0c1416` (Fundo geral da página)
- **Fundo Primário (`--bg-primary`):** `#1b2a2f` (Cartões principais, painéis e modais)
- **Fundo Secundário (`--bg-secondary`):** `#507b84` (Destaques de fundo, hovers e elementos interativos)
- **Fundo Terciário (`--bg-tertiary`):** `#2e454d` (Bordas, divisórias e rolagem)
- **Texto Principal (`--text-general`):** `#ffffff` (Títulos e textos de leitura primária)
- **Texto Discreto (`--text-discreto`):** `#426273` (Textos de apoio, legendas e rótulos secundários)

### Tema Claro (Clean Theme)
Focado em alta legibilidade, contraste nítido e aparência limpa para uso diurno.
- **Fundo do App (`--bg-app`):** `#dfe8eb` (Fundo geral da página, tom levemente acinzentado/azulado)
- **Fundo Primário (`--bg-primary`):** `#fdfefe` (Cartões, painéis e área de conteúdo - quase branco)
- **Fundo Secundário (`--bg-secondary`):** `#022235` (Elementos de contraste, ações primárias)
- **Fundo Terciário (`--bg-tertiary`):** `#d2dcdf` (Bordas de painéis, divisórias)
- **Texto Principal (`--text-general`):** `#022235` (Títulos e conteúdo focado, alto contraste)
- **Texto Discreto (`--text-discreto`):** `#375463` (Textos auxiliares e dados secundários)

## 5. Elementos de Interface (UI Components)
- **Raios de Borda (Border Radius):**
  - **Large (`24px`):** Utilizado em cartões principais, modais e grandes agrupamentos de conteúdo (`card-flat`).
  - **Medium (`16px`):** Utilizado em botões grandes e campos de entrada de formulários (`button-flat`).
  - **Small (`10px`):** Utilizado em tags, badges e pequenos indicadores (`tag-flat`).
- **Animações e Transições:** Utilização de `framer-motion` (Motion) para entrada suave de rotas e transição de cores (`0.3s ease`) ao trocar de temas.
- **Scrollbar:** Customizada para uma barra de rolagem minimalista, integrada às cores dos fundos terciário e secundário de cada tema.

## 6. Funcionalidades Core
- **Dashboard:** Visão consolidada do patrimônio e estatísticas resumidas.
- **Extrato:** Lista cronológica de todas as movimentações.
- **Categorias:** Gestão e visualização de gastos separados por categorias semânticas.
- **Contas e Cartões:** Gestão de múltiplas contas (corrente, poupança) e limites de cartões.
- **Reservas / Cofrinhos:** Metas financeiras isoladas com controle de progresso.
- **Configurações:** Controle de privacidade, exportação de dados, ajustes de tema e estado.
