import { Resend } from "resend";

// Wrapper fino sobre o Resend. Segue o mesmo padrão de lib/meta-api/index.ts:
// se a credencial não estiver configurada (dev local, CI, etc.), a chamada
// é ignorada silenciosamente (loga um aviso) em vez de derrubar a rota que
// disparou a notificação — envio de e-mail nunca deve quebrar uma mutação
// de negócio como troca de status.

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Plataforma Agência <notificacoes@plataforma-agencia.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

// Nunca lança: erros de envio são logados e engolidos para não quebrar o
// fluxo de negócio que disparou a notificação (ex: mudança de status).
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; error?: string }> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurada — notificação não enviada:", input.subject);
    return { sent: false, error: "RESEND_API_KEY não configurada" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error("[email] falha ao enviar via Resend:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] exceção ao enviar via Resend:", err);
    return { sent: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
