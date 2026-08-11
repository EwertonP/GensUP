import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// GET /api/agent-tasks/[id]/runs -- historico de raciocinio do agente para uma
// task (aba "raciocínio do agente" no Frontend). RLS isola via join implicito
// (agent_runs_same_client_or_admin, supabase/migrations/002_rls_policies.sql).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("agent_task_id", id)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
