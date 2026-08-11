import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// Slugs que colidiriam com rotas estaticas do app (/login, /kanban, etc) --
// tanto em utm_links.slug (rota /l/[slug]) quanto em clients.slug (rota /b/[slug]).
const RESERVED_SLUGS = new Set([
  "login",
  "signup",
  "kanban",
  "dashboard",
  "approvals",
  "insights",
  "api",
  "l",
  "b",
]);

// destination_url e livre (so agencia/admin cria utm_links, ver requireRole abaixo), mas
// deve ser http(s) -- bloqueia esquemas perigosos (javascript:, data:, file:, etc) que
// poderiam ser injetados no Location header do redirect publico em app/l/[slug]/route.ts.
function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const ctx = await requireAuth();
    const supabase = await createClient();
    let query = supabase.from("utm_links").select("*").order("created_at", { ascending: false });
    if (ctx.role === "cliente" && ctx.clientId) {
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

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["agencia", "admin"]);
    const body = await req.json();

    if (!body.slug || !body.title || !body.destination_url) {
      return NextResponse.json({ error: "slug, title e destination_url são obrigatórios" }, { status: 400 });
    }
    if (RESERVED_SLUGS.has(body.slug)) {
      return NextResponse.json({ error: `slug "${body.slug}" é reservado` }, { status: 400 });
    }
    if (!isSafeHttpUrl(body.destination_url)) {
      return NextResponse.json({ error: "destination_url deve ser uma URL http(s) válida" }, { status: 400 });
    }
    const clientId = body.client_id ?? ctx.clientId;
    if (!clientId) {
      return NextResponse.json({ error: "client_id é obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("utm_links")
      .insert({
        client_id: clientId,
        slug: body.slug,
        title: body.title,
        destination_url: body.destination_url,
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        utm_content: body.utm_content ?? null,
        utm_term: body.utm_term ?? null,
        is_active: body.is_active ?? true,
        created_by: ctx.userId,
      })
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
