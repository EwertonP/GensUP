import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// Dispara a Edge Function sync-insights para a conta social informada.
// Implementação real da fila/rate-limit vive em supabase/functions/sync-insights.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["agencia", "admin"]);
    const { social_account_id } = await req.json();
    if (!social_account_id) {
      return NextResponse.json({ error: "social_account_id é obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();

    // A Edge Function usa service_role (ignora RLS), então a posse da conta precisa ser
    // validada aqui antes de disparar — sem isso, um usuário `agencia` de um client_id
    // poderia acionar sync para social_account_id de outro cliente. (A Edge Function
    // também revalida role + posse por conta própria — ver supabase/functions/sync-insights —
    // porque é alcançável diretamente pela URL pública com qualquer JWT válido; esta
    // checagem aqui é defesa em profundidade + retorna 404 em vez de 403 antes de sair
    // do processo Next.js.)
    if (ctx.role !== "admin") {
      const { data: account, error: ownershipError } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("id", social_account_id)
        .single();
      if (ownershipError || !account) {
        return NextResponse.json({ error: "Conta social não encontrada" }, { status: 404 });
      }
    }

    // Encaminha o JWT do próprio usuário (não a service_role key) — é esse JWT que a
    // Edge Function valida para extrair role/client_id e checar posse do recurso.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-insights`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ social_account_id }),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json({ error: body?.error ?? "Falha ao acionar sync" }, { status: res.status || 502 });
    }
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ triggered: true, ...body });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
