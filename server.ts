import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/analyze-meta", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
      }

      const { meta, averages, savingsCat } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Você é um assistente financeiro. Analise a seguinte meta e a situação financeira do usuário para dar dicas reais, moderadas e amigáveis.
      
      Dados da Meta:
      Nome: ${meta.nome}
      Valor Desejado: R$ ${meta.valorDesejado}
      Valor Acumulado: R$ ${meta.valorAcumulado}
      Prazo: ${meta.dataDesejada}
      
      Situação Mensal (Médias):
      Receitas: R$ ${averages.receitas}
      Despesas: R$ ${averages.despesas}
      Saldo Livre: R$ ${averages.saldo}
      
      Possíveis áreas de redução sugeridas pelo app:
      ${savingsCat.map((c: any) => `- ${c.nome}: Gasto médio R$ ${c.avg}`).join('\n')}

      Não refaça os cálculos matemáticos precisos, apenas forneça uma avaliação estratégica, um plano em passos e algumas dicas contextuais baseadas nessas informações. Não invente transações. Responda num tom motivador.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumoCurto: { type: Type.STRING, description: "Um resumo de 1 ou 2 frases sobre a meta e a situação" },
              situacao: { type: Type.STRING, description: "Avaliação se a meta está fácil, apertada ou difícil" },
              passos: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "3 a 5 passos práticos para o usuário seguir"
              },
              sugestoesAjustes: { type: Type.STRING, description: "Sugestão de onde o usuário pode cortar gastos (se necessário) baseada nas categorias" },
              mensagemFinal: { type: Type.STRING, description: "Uma frase motivacional curta" }
            },
            required: ["resumoCurto", "situacao", "passos", "sugestoesAjustes", "mensagemFinal"]
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) throw new Error("No response from Gemini");

      res.json(JSON.parse(textResponse));
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Erro ao processar análise inteligente", details: error.message });
    }
  });

  app.post("/api/analyze-overview", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor." });
      }

      const { periodoLabel, totalReceitas, totalDespesas, saldo, economizado, variacaoDespesas, topCategorias, qtdLancamentos } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Você é um consultor financeiro pessoal experiente, direto, amigável e estratégico.
Analise o resumo financeiro do usuário referente ao período "${periodoLabel}" e forneça um diagnóstico inteligente com recomendações acionáveis.

Dados Financeiros do Período (${periodoLabel}):
- Total de Receitas: R$ ${totalReceitas}
- Total de Despesas: R$ ${totalDespesas}
- Saldo Final: R$ ${saldo} (Valor economizado líquido: R$ ${economizado})
- Variação de Despesas vs Período Anterior: ${variacaoDespesas !== undefined ? `${variacaoDespesas.toFixed(1)}%` : 'Sem dados comparativos'}
- Quantidade de Lançamentos Registrados: ${qtdLancamentos}

Principais Categorias de Despesas no Período:
${(topCategorias || []).map((c: any) => `- ${c.nome}: R$ ${c.valor} (${c.percentual}% do total)`).join('\n')}

Forneça uma análise personalizada, prática e construtiva. Não invente números inexistentes. Se o saldo for negativo, sugira correções urgentes e realistas. Se for positivo, sugira otimização e investimentos/reserva. Responda em português.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resumoGeral: { type: Type.STRING, description: "Diagnóstico executivo de 1 ou 2 frases sobre o desempenho financeiro do período" },
              saudeFinanceira: { type: Type.STRING, description: "Classificação como 'Excelente', 'Saudável', 'Atenção Necessária' ou 'Crítica', com uma breve justificativa" },
              pontosFortes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 a 3 hábitos positivos ou aspectos fortes identificados"
              },
              pontosAtencao: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 a 3 riscos, gargalos ou categorias com gastos desproporcionais"
              },
              recomendacoes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 a 5 ações práticas e imediatas para economizar ou gerenciar melhor o orçamento"
              },
              mensagemFinal: { type: Type.STRING, description: "Frase motivacional ou conselho de ouro final" }
            },
            required: ["resumoGeral", "saudeFinanceira", "pontosFortes", "pontosAtencao", "recomendacoes", "mensagemFinal"]
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) throw new Error("No response from Gemini");

      res.json(JSON.parse(textResponse));
    } catch (error: any) {
      console.error("Gemini Overview API Error:", error);
      res.status(500).json({ error: "Erro ao processar análise inteligente da visão geral", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
