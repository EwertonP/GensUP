// Wrapper simples para a Generative Language API do Gemini — usado pelo worker
// do agente autonomo (Fase 5) para gerar sugestoes de legenda.
//
// Desvio documentado do roadmap original: o GensBot (github.com/EwertonP/GENSBot,
// ja em producao) e uma ferramenta de automacao de mensagens/WhatsApp-Instagram
// (flows, filas, contatos) -- NAO tem capacidade de geracao de copy. A geracao de
// sugestao de legenda chama uma API de LLM diretamente, nao o GensBot.
//
// Segue o mesmo padrao de erro gracioso do lib/meta-api: sem GEMINI_API_KEY
// configurada, lanca LlmCredentialsError -- o caller (rota Next.js) deve capturar
// e responder 501, nunca 500 generico.
//
// Principio central do produto: "nada e chutado" -- toda sugestao do agente carrega
// uma confianca. suggestCaption() sempre retorna confianca baixa (0.4) porque e uma
// inferencia da LLM sem revisao humana; o outcome em agent_runs e sempre
// 'sugerido_para_revisao' nesta versao (MVP), nunca aplicado automaticamente.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Testado manualmente contra a API real (ver histórico da Fase 5): modelos
// "-latest"/Gemini 3 fazem "thinking" implícito que não aceita ser desligado
// (thinkingConfig.thinkingBudget=0 retorna 400 nesses modelos) e consome o
// orçamento de tokens, cortando a resposta antes do texto real. gemini-2.0-flash
// e gemini-2.5-flash-lite já foram descontinuados. gemini-3.5-flash-lite responde
// direto, sem thinking, adequado para uma tarefa simples de completude de texto.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export class LlmCredentialsError extends Error {
  constructor(message = "Credencial de LLM (GEMINI_API_KEY) não configurada") {
    super(message);
    this.name = "LlmCredentialsError";
  }
}

export class LlmApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmApiError";
    this.status = status;
  }
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmCredentialsError();
  return apiKey;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(`${GEMINI_API_BASE}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as GeminiGenerateContentResponse;

  if (!res.ok) {
    throw new LlmApiError(body?.error?.message ?? "Falha na chamada à API do Gemini", res.status);
  }

  const text = body.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) {
    throw new LlmApiError("Resposta da API do Gemini sem conteúdo de texto");
  }

  return text.trim();
}

export interface SuggestCaptionContext {
  contentType: string;
  clientName?: string;
  briefing?: string;
}

export interface SuggestCaptionResult {
  text: string;
  confidence: number;
  prompt: string;
}

// Confianca fixa e baixa: e sempre uma inferencia da LLM sem contexto de marca
// aprofundado, entao a sugestao nunca deve ser aplicada automaticamente -- vira
// sempre revisao humana (agent_runs.outcome = 'sugerido_para_revisao').
const CAPTION_SUGGESTION_CONFIDENCE = 0.4;

export async function suggestCaption(context: SuggestCaptionContext): Promise<SuggestCaptionResult> {
  const prompt = [
    "Você é um assistente de social media de uma agência de marketing brasileira.",
    `Escreva uma legenda curta em pt-BR para uma publicação do tipo "${context.contentType}".`,
    context.clientName ? `Cliente: ${context.clientName}.` : null,
    context.briefing ? `Briefing/contexto: ${context.briefing}.` : null,
    "Responda apenas com o texto da legenda, sem aspas, sem explicações adicionais.",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await callGemini(prompt);

  return { text, confidence: CAPTION_SUGGESTION_CONFIDENCE, prompt };
}
