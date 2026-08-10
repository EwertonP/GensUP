import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

// Apenas o próprio usuário pode atualizar seu profile (RLS: users_update_self).
// Trocar client_id/role exige admin client (fora do escopo desta rota).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    if (ctx.userId !== id && ctx.role !== "admin") {
      return NextResponse.json({ error: "Só é possível editar o próprio usuário" }, { status: 403 });
    }
    const body = await req.json();
    // role/client_id nunca vêm do body: trocar de tenant ou virar admin exige o admin client
    // (defesa em profundidade — a migration 003 já bloqueia isso a nível de trigger/DB).
    const { role: _role, client_id: _clientId, ...safeBody } = body ?? {};
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").update(safeBody).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth().then((ctx) => {
      if (ctx.role !== "admin") throw new ForbiddenError("Apenas admin pode remover usuários");
    });
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
