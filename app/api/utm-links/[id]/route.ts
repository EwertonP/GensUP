import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";
import type { TablesUpdate } from "@/lib/supabase/types";

// Campos editaveis via PATCH -- client_id/slug/created_by nunca mudam depois de criados
// (slug e a chave da rota publica /l/[slug]; trocar quebraria links ja distribuidos).
const EDITABLE_FIELDS = [
  "title",
  "destination_url",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "is_active",
] as const;

// destination_url deve continuar http(s) apos edicao -- mesma regra do POST
// (app/api/utm-links/route.ts), ver isSafeHttpUrl la para o motivo.
function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["agencia", "admin"]);
    const { id } = await params;
    const body = await req.json();

    if (typeof body.destination_url === "string" && !isSafeHttpUrl(body.destination_url)) {
      return NextResponse.json({ error: "destination_url deve ser uma URL http(s) válida" }, { status: 400 });
    }

    const update: TablesUpdate<"utm_links"> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) update[field] = body[field];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nenhum campo editável enviado" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("utm_links").update(update).eq("id", id).select().single();
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
    await requireRole(["agencia", "admin"]);
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from("utm_links").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
