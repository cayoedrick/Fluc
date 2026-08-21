var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_config = require("dotenv/config");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/analyze-meta", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY n\xE3o configurada no servidor." });
      }
      const { meta, averages, savingsCat } = req.body;
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `Voc\xEA \xE9 um assistente financeiro. Analise a seguinte meta e a situa\xE7\xE3o financeira do usu\xE1rio para dar dicas reais, moderadas e amig\xE1veis.
      
      Dados da Meta:
      Nome: ${meta.nome}
      Valor Desejado: R$ ${meta.valorDesejado}
      Valor Acumulado: R$ ${meta.valorAcumulado}
      Prazo: ${meta.dataDesejada}
      
      Situa\xE7\xE3o Mensal (M\xE9dias):
      Receitas: R$ ${averages.receitas}
      Despesas: R$ ${averages.despesas}
      Saldo Livre: R$ ${averages.saldo}
      
      Poss\xEDveis \xE1reas de redu\xE7\xE3o sugeridas pelo app:
      ${savingsCat.map((c) => `- ${c.nome}: Gasto m\xE9dio R$ ${c.avg}`).join("\n")}

      N\xE3o refa\xE7a os c\xE1lculos matem\xE1ticos precisos, apenas forne\xE7a uma avalia\xE7\xE3o estrat\xE9gica, um plano em passos e algumas dicas contextuais baseadas nessas informa\xE7\xF5es. N\xE3o invente transa\xE7\xF5es. Responda num tom motivador.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              resumoCurto: { type: import_genai.Type.STRING, description: "Um resumo de 1 ou 2 frases sobre a meta e a situa\xE7\xE3o" },
              situacao: { type: import_genai.Type.STRING, description: "Avalia\xE7\xE3o se a meta est\xE1 f\xE1cil, apertada ou dif\xEDcil" },
              passos: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "3 a 5 passos pr\xE1ticos para o usu\xE1rio seguir"
              },
              sugestoesAjustes: { type: import_genai.Type.STRING, description: "Sugest\xE3o de onde o usu\xE1rio pode cortar gastos (se necess\xE1rio) baseada nas categorias" },
              mensagemFinal: { type: import_genai.Type.STRING, description: "Uma frase motivacional curta" }
            },
            required: ["resumoCurto", "situacao", "passos", "sugestoesAjustes", "mensagemFinal"]
          }
        }
      });
      const textResponse = response.text;
      if (!textResponse) throw new Error("No response from Gemini");
      res.json(JSON.parse(textResponse));
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Erro ao processar an\xE1lise inteligente", details: error.message });
    }
  });
  app.post("/api/analyze-overview", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY n\xE3o configurada no servidor." });
      }
      const { periodoLabel, totalReceitas, totalDespesas, saldo, economizado, variacaoDespesas, topCategorias, qtdLancamentos } = req.body;
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const prompt = `Voc\xEA \xE9 um consultor financeiro pessoal experiente, direto, amig\xE1vel e estrat\xE9gico.
Analise o resumo financeiro do usu\xE1rio referente ao per\xEDodo "${periodoLabel}" e forne\xE7a um diagn\xF3stico inteligente com recomenda\xE7\xF5es acion\xE1veis.

Dados Financeiros do Per\xEDodo (${periodoLabel}):
- Total de Receitas: R$ ${totalReceitas}
- Total de Despesas: R$ ${totalDespesas}
- Saldo Final: R$ ${saldo} (Valor economizado l\xEDquido: R$ ${economizado})
- Varia\xE7\xE3o de Despesas vs Per\xEDodo Anterior: ${variacaoDespesas !== void 0 ? `${variacaoDespesas.toFixed(1)}%` : "Sem dados comparativos"}
- Quantidade de Lan\xE7amentos Registrados: ${qtdLancamentos}

Principais Categorias de Despesas no Per\xEDodo:
${(topCategorias || []).map((c) => `- ${c.nome}: R$ ${c.valor} (${c.percentual}% do total)`).join("\n")}

Forne\xE7a uma an\xE1lise personalizada, pr\xE1tica e construtiva. N\xE3o invente n\xFAmeros inexistentes. Se o saldo for negativo, sugira corre\xE7\xF5es urgentes e realistas. Se for positivo, sugira otimiza\xE7\xE3o e investimentos/reserva. Responda em portugu\xEAs.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              resumoGeral: { type: import_genai.Type.STRING, description: "Diagn\xF3stico executivo de 1 ou 2 frases sobre o desempenho financeiro do per\xEDodo" },
              saudeFinanceira: { type: import_genai.Type.STRING, description: "Classifica\xE7\xE3o como 'Excelente', 'Saud\xE1vel', 'Aten\xE7\xE3o Necess\xE1ria' ou 'Cr\xEDtica', com uma breve justificativa" },
              pontosFortes: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "1 a 3 h\xE1bitos positivos ou aspectos fortes identificados"
              },
              pontosAtencao: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "1 a 3 riscos, gargalos ou categorias com gastos desproporcionais"
              },
              recomendacoes: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "3 a 5 a\xE7\xF5es pr\xE1ticas e imediatas para economizar ou gerenciar melhor o or\xE7amento"
              },
              mensagemFinal: { type: import_genai.Type.STRING, description: "Frase motivacional ou conselho de ouro final" }
            },
            required: ["resumoGeral", "saudeFinanceira", "pontosFortes", "pontosAtencao", "recomendacoes", "mensagemFinal"]
          }
        }
      });
      const textResponse = response.text;
      if (!textResponse) throw new Error("No response from Gemini");
      res.json(JSON.parse(textResponse));
    } catch (error) {
      console.error("Gemini Overview API Error:", error);
      res.status(500).json({ error: "Erro ao processar an\xE1lise inteligente da vis\xE3o geral", details: error.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
