import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET() {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_accounts")
      .select("id, client_id, platform, last_sync, created_at"); // access_token nunca sai do server
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

// Criação real acontece via /api/auth/callback (fluxo OAuth Meta).
// Este endpoint cobre apenas contas não-OAuth cadastradas manualmente por um admin.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["agencia", "admin"]);
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_accounts")
      .insert({ ...body, client_id: ctx.clientId })
      .select("id, client_id, platform, last_sync, created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
