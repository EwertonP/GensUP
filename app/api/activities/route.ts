import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// GET /api/activities?prospect_id=... ou ?client_id=... -- leitura depende de RLS
// (agencia/admin veem tudo, cliente so ve activities do proprio client_id).
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const supabase = await createClient();
    const prospectId = req.nextUrl.searchParams.get("prospect_id");
    const clientId = req.nextUrl.searchParams.get("client_id");

    let query = supabase.from("activities").select("*").order("created_at", { ascending: false });
    if (prospectId) query = query.eq("prospect_id", prospectId);
    if (clientId) query = query.eq("client_id", clientId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

// POST -- qualquer usuario autenticado pode tentar criar; RLS de insert e quem
// decide de fato (agencia/admin para prospect_id; client_id = auth_client_id()
// ou agencia/admin para client_id). Isso permite que um cliente registre uma nota
// no proprio timeline pos-venda, mas nunca em um prospect ou em outro client.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activities")
      .insert({ ...body, created_by: ctx.userId })
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
