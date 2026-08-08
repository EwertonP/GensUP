import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET() {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

// Enfileira uma tarefa para o agent-worker (edge function) processar.
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["agencia", "admin"]);
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_tasks")
      .insert({ ...body, client_id: ctx.clientId, status: "pending" })
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
