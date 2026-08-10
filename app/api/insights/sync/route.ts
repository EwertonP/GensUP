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

    // A Edge Function usa service_role (ignora RLS), então a posse da conta precisa ser
    // validada aqui antes de disparar — sem isso, um usuário `agencia` de um client_id
    // poderia acionar sync para social_account_id de outro cliente.
    if (ctx.role !== "admin") {
      const supabase = await createClient();
      const { data: account, error: ownershipError } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("id", social_account_id)
        .single();
      if (ownershipError || !account) {
        return NextResponse.json({ error: "Conta social não encontrada" }, { status: 404 });
      }
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-insights`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ social_account_id }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao acionar sync" }, { status: 502 });
    }
    return NextResponse.json({ triggered: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
