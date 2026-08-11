// Wrapper simples para a Messages API da Anthropic — usado pelo worker do agente
// autonomo (Fase 5) para gerar sugestoes de legenda.
//
// Desvio documentado do roadmap original: o GensBot (github.com/EwertonP/GENSBot,
// ja em producao) e uma ferramenta de automacao de mensagens/WhatsApp-Instagram
// (flows, filas, contatos) -- NAO tem capacidade de geracao de copy. A geracao de
// sugestao de legenda chama a API da Anthropic diretamente, nao o GensBot.
//
// Segue o mesmo padrao de erro gracioso do lib/meta-api: sem ANTHROPIC_API_KEY
// configurada, lanca LlmCredentialsError -- o caller (rota Next.js) deve capturar
// e responder 501, nunca 500 generico.
//
// Principio central do produto: "nada e chutado" -- toda sugestao do agente carrega
// uma confianca. suggestCaption() sempre retorna confianca baixa (0.4) porque e uma
// inferencia da LLM sem revisao humana; o outcome em agent_runs e sempre
// 'sugerido_para_revisao' nesta versao (MVP), nunca aplicado automaticamente.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

export class LlmCredentialsError extends Error {
  constructor(message = "Credencial de LLM (ANTHROPIC_API_KEY) não configurada") {
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new LlmCredentialsError();
  return apiKey;
}

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = getApiKey();

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as AnthropicMessageResponse;

  if (!res.ok) {
    throw new LlmApiError(body?.error?.message ?? "Falha na chamada à API da Anthropic", res.status);
  }

  const text = body.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new LlmApiError("Resposta da API da Anthropic sem conteúdo de texto");
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

  const text = await callAnthropic(prompt);

  return { text, confidence: CAPTION_SUGGESTION_CONFIDENCE, prompt };
}
