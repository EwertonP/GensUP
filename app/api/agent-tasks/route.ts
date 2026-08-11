import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// GET /api/agent-tasks -- lista tasks do client_id do usuario, ou todas se
// admin/agencia. RLS ja isola por client_id no banco; o filtro explicito aqui
// e so pra deixar a intencao clara e evitar depender so da policy.
export async function GET() {
  try {
    const ctx = await requireAuth();
    const supabase = await createClient();
    let query = supabase.from("agent_tasks").select("*").order("created_at", { ascending: false });
    if (ctx.role === "cliente") {
      query = query.eq("client_id", ctx.clientId);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

// Enfileira uma tarefa para o agent-worker processar. Util para testes e para o
// botão "gerar sugestão de legenda" que o Frontend constrói (ex: type=
// 'sugerir_legenda', payload={ content_item_id }).
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["agencia", "admin"]);
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_tasks")
      .insert({ ...body, client_id: body.client_id ?? ctx.clientId, status: "pending" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
