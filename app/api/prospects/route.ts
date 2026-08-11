import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// GET /api/prospects?stage=novo -- lista prospects (leads pre-venda). Restrito a
// agencia/admin -- clientes nunca veem prospects (RLS + checagem de rota).
export async function GET(req: NextRequest) {
  try {
    await requireRole(["agencia", "admin"]);
    const supabase = await createClient();
    const stage = req.nextUrl.searchParams.get("stage");

    let query = supabase.from("prospects").select("*").order("created_at", { ascending: false });
    if (stage) query = query.eq("stage", stage);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["agencia", "admin"]);
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase.from("prospects").insert(body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
