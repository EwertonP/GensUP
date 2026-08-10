import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

// Notificações por e-mail disparadas em app/api/content-items/[id]/status/route.ts.
// Usa o client admin (service_role) porque precisa ler destinatários fora do
// escopo de RLS do usuário que fez a requisição (ex: agência lendo e-mails de
// usuários "cliente", e vice-versa).

type NotifiableStatus = "in_review" | "changes_requested";

const SUBJECTS: Record<NotifiableStatus, (contentItemId: string) => string> = {
  in_review: (id) => `Novo conteúdo para aprovação (${id})`,
  changes_requested: (id) => `Ajustes solicitados em conteúdo (${id})`,
};

function buildHtml(status: NotifiableStatus, contentItemId: string): string {
  if (status === "in_review") {
    return `
      <p>Um novo conteúdo está disponível para aprovação.</p>
      <p><strong>ID do conteúdo:</strong> ${contentItemId}</p>
      <p>Acesse a plataforma para revisar e aprovar ou solicitar ajustes.</p>
    `;
  }
  return `
    <p>O cliente solicitou ajustes em um conteúdo.</p>
    <p><strong>ID do conteúdo:</strong> ${contentItemId}</p>
    <p>Acesse a plataforma para ver os comentários e reenviar o conteúdo revisado.</p>
  `;
}

// Dispara a notificação de forma best-effort: qualquer erro é logado e
// engolido para nunca quebrar a transição de status que a originou.
export async function notifyContentStatusChange(params: {
  contentItemId: string;
  clientId: string | null;
  status: string;
}): Promise<void> {
  const { contentItemId, clientId, status } = params;

  if (status !== "in_review" && status !== "changes_requested") return;
  const notifiableStatus = status as NotifiableStatus;

  try {
    const admin = createAdminClient();

    let recipientsQuery = admin.from("users").select("email, role, client_id");

    if (notifiableStatus === "in_review") {
      // Notifica o cliente: usuários "cliente" do mesmo client_id do conteúdo
      if (!clientId) return;
      recipientsQuery = recipientsQuery.eq("role", "cliente").eq("client_id", clientId);
    } else {
      // Notifica a agência: usuários "agencia"/"admin" (globais ou escopados a este client_id)
      recipientsQuery = recipientsQuery
        .in("role", ["agencia", "admin"])
        .or(clientId ? `client_id.is.null,client_id.eq.${clientId}` : "client_id.is.null");
    }

    const { data: recipients, error } = await recipientsQuery;
    if (error) {
      console.error("[notifications] falha ao buscar destinatários:", error.message);
      return;
    }
    if (!recipients || recipients.length === 0) return;

    const emails = recipients.map((r) => r.email).filter(Boolean);
    if (emails.length === 0) return;

    await sendEmail({
      to: emails,
      subject: SUBJECTS[notifiableStatus](contentItemId),
      html: buildHtml(notifiableStatus, contentItemId),
    });
  } catch (err) {
    console.error("[notifications] falha inesperada ao notificar mudança de status:", err);
  }
}
