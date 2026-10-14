# Manual de Funcionamento do Aplicativo Fluc

Este documento detalha o funcionamento de todas as funcionalidades, módulos e opções disponíveis no aplicativo **Fluc Financeiro**, organizado por seções do menu lateral e tópicos relacionados.

---

## 1. Dashboard (Visão Geral)
O Dashboard é a tela principal de entrada do aplicativo, oferecendo uma radiografia completa da saúde financeira do mês selecionado.

- **Seletor de Mês/Ano:** Permite navegar entre os meses para visualizar dados históricos ou futuros.
- **Cards de Resumo:**
  - **Saldo Atual / Saldo Total:** Soma consolidada das contas bancárias ativas e valores disponíveis.
  - **Receitas do Mês:** Total de entradas confirmadas ou previstas no período.
  - **Despesas do Mês:** Total de saídas (despesas comuns e faturas de cartão) no período.
- **Gráficos e Indicadores:**
  - **Gráfico de Gastos por Categoria:** Distribuição visual das despesas para identificar onde o dinheiro está sendo gasto.
  - **Resumo de Contas e Cartões:** Acesso rápido aos saldos das contas e status das faturas de cartão.
- **Ajuste de Fatura Rápido:** Permite ajustar o valor da fatura de um cartão diretamente no mês selecionado. Ao confirmar, o sistema gera automaticamente um lançamento de ajuste posicionado no **último dia do mês selecionado**, garantindo precisão no período contábil.

---

## 2. Extrato (Lançamentos)
O módulo de extrato centraliza todas as movimentações financeiras.

- **Filtros e Busca:** Filtre lançamentos por mês, tipo (receita, despesa, transferência, despesa de cartão) e busque por descrição.
- **Adição de Lançamentos:**
  - **Receita / Despesa:** Vinculada a uma conta e categoria, com data e status de efetivação (Recebido/Pago).
  - **Transferência:** Movimenta valores entre duas contas cadastradas.
  - **Despesa de Cartão:** Lançada diretamente na fatura de um cartão de crédito.
- **Edição e Exclusão:** Cada lançamento pode ser editado ou excluído a qualquer momento, atualizando automaticamente os saldos das contas ou faturas correspondentes.

---

## 3. Análise Financeira e Metas
Ferramentas avançadas para planejamento de longo prazo e análise de comportamento financeiro.

- **Análise por Categoria e Fluxo de Caixa:** Relatórios detalhados com gráficos de evolução mensal.
- **Projeção de Saldo (Forecast):** Projeta a evolução dos saldos das contas com base em receitas e despesas recorrentes.
- **Metas Financeiras:**
  - **Criação de Metas:** Defina objetivos de longo prazo (ex: viagem, reserva de emergência, compra de bem) com valor desejado e prazo.
  - **Cálculo de Viabilidade:** O sistema calcula automaticamente o aporte mensal necessário e avalia se a meta é viável, exigente ou em concorrência com outras metas.
  - **Edição:** Atualize o valor desejado ou prazo de qualquer meta.
  - **Exclusão com Confirmação:** Ao clicar no botão de excluir (ao lado de editar), o sistema exibe um modal de confirmação exigindo validação para evitar exclusões acidentais. Após a confirmação, as sugestões de economia e aportes das demais metas são recalculadas dinamicamente.

---

## 4. Categorias
Gerencie as classificações das suas receitas e despesas.

- **Personalização:** Crie novas categorias, edite nomes, defina ícones e cores para facilitar a visualização nos gráficos e relatórios.
- **Tipos:** Separação clara entre categorias de receita e de despesa.

---

## 5. Contas e Cartões
Gerenciamento de instituições financeiras, contas bancárias e cartões de crédito.

- **Contas Bancárias:**
  - Cadastre contas (ex: Itaú, Nubank, Dinheiro, Carteira).
  - Defina saldo inicial e utilize a opção de ajuste de saldo (que cria automaticamente um lançamento de ajuste se houver diferença).
  - Configure chave PIX e marque a conta principal.
- **Cartões de Crédito:**
  - Cadastre cartões informando limite, dia de fechamento e dia de vencimento.
  - **Ajustar Fatura:** Permite corrigir o valor total de uma fatura para um determinado mês. O lançamento de ajuste correspondente é gerado automaticamente no **último dia do mês selecionado**.
  - **Pagamento de Fatura:** Execute o pagamento da fatura selecionando a conta de origem, gerando a transferência ou débito adequado.

---

## 6. Reserva e Cofrinhos
Organize suas reservas financeiras separadas do saldo livre do dia a dia.

- **Cofrinhos:** Crie objetivos de reserva com valor inicial e meta.
- **Histórico:** Registre depósitos e retiradas em cada cofrinho. O sistema mantém um histórico completo e atualiza o saldo reservado instantaneamente.

---

## 7. Configurações e Sincronização
Painel de controle do aplicativo, backup e sincronização multi-dispositivo.

- **Sincronização em Nuvem (Google / Firebase Firestore):**
  - Conecte sua conta Google para sincronizar seus dados em tempo real entre diferentes dispositivos (celular, tablet, computador).
  - **Monitoramento de Conexão:** Indicador visual de status online/offline na barra superior e no ícone de nuvem.
  - **Forçar Sincronização:** Botão dedicado para disparar a sincronização manual e verificar o sucesso do upload e download.
- **Backup e Restauração:**
  - **Exportar JSON:** Baixe um arquivo de backup completo com todos os seus dados financeiros.
  - **Importar JSON:** Restaure dados de um backup anterior em segundos.
- **Limpeza e Redefinição:**
  - Opção para apagar todos os lançamentos mantendo contas e cartões.
  - Redefinição total para o estado inicial de fábrica.
- **Alternância de Tema:** Alterne instantaneamente entre o modo Claro (Clean) e o modo Escuro (Dark).
- **Instalação PWA:** Instale o aplicativo no seu dispositivo móvel ou desktop para acesso offline e experiência nativa.
