import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase.from("content_items").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (ctx.role !== "agencia" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Apenas agencia pode editar conteudo" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    // `status` nunca vem por aqui: a maquina de estados (draft -> in_review -> ...)
    // so e aplicada em PATCH /api/content-items/[id]/status, que valida role + transicao
    // valida. Aceitar `status` livre neste endpoint permitiria pular etapas (ex: draft
    // direto para published). A trigger `validate_content_status_transition`
    // (supabase/migrations/010_content_status_state_machine.sql) e a rede de seguranca
    // real no banco, mas a API tambem nao deve oferecer esse caminho.
    // Ver docs/security/REVIEW_FASE1.md, achado #2.
    const { status: _status, ...safeBody } = body ?? {};
    const supabase = await createClient();
    const { data, error } = await supabase.from("content_items").update(safeBody).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
