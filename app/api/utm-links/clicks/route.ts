import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// GET /api/utm-links/clicks?client_id=<uuid>
//
// Cliques agregados por dia (últimos 30 dias) para os links UTM do usuário
// autenticado — alimenta uma aba de cliques no dashboard de insights.
// Formato de resposta: [{ date: "YYYY-MM-DD", count: number }], um item por
// dia com pelo menos 1 clique (dias sem clique não aparecem — o Frontend
// preenche os buracos se precisar de um eixo contínuo).
//
// `client_id` é role cliente: sempre o próprio (ignorado se enviado, RLS
// filtra de qualquer forma); role agencia/admin: opcional, filtra por um
// client específico, senão agrega todos os clients visíveis.
// RLS de link_clicks (migration 008, policy
// "link_clicks_select_same_client_or_admin") já restringe a leitura ao dono
// do link — a query com o client autenticado (não o admin client) já filtra
// certo, não precisamos repetir a lógica de tenant aqui.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const supabase = await createClient();

    const requestedClientId = req.nextUrl.searchParams.get("client_id");
    const effectiveClientId = ctx.role === "cliente" ? ctx.clientId : requestedClientId;

    let linkIdsQuery = supabase.from("utm_links").select("id");
    if (effectiveClientId) {
      linkIdsQuery = linkIdsQuery.eq("client_id", effectiveClientId);
    }
    const { data: links, error: linksError } = await linkIdsQuery;
    if (linksError) return NextResponse.json({ error: linksError.message }, { status: 400 });

    const linkIds = (links ?? []).map((l) => l.id);
    if (linkIds.length === 0) return NextResponse.json([]);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: clicks, error: clicksError } = await supabase
      .from("link_clicks")
      .select("clicked_at")
      .in("utm_link_id", linkIds)
      .gte("clicked_at", since.toISOString());
    if (clicksError) return NextResponse.json({ error: clicksError.message }, { status: 400 });

    const countsByDay = new Map<string, number>();
    for (const click of clicks ?? []) {
      const day = click.clicked_at.slice(0, 10); // YYYY-MM-DD
      countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
    }

    const result = Array.from(countsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
