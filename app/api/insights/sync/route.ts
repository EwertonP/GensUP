import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// Dispara a Edge Function sync-insights para a conta social informada.
// Implementação real da fila/rate-limit vive em supabase/functions/sync-insights.
export async function POST(req: NextRequest) {
  try {
    await requireRole(["agencia", "admin"]);
    const { social_account_id } = await req.json();
    if (!social_account_id) {
      return NextResponse.json({ error: "social_account_id é obrigatório" }, { status: 400 });
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
