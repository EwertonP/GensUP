import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";
import type { FeedbackHistoryEntry } from "@/lib/types/content";

// GET /api/content-items/[id]/history
//
// Retorna o histórico de mudanças de status de um content_item, populado
// automaticamente pelo trigger on_content_item_status_change (ver
// supabase/migrations/010_audit.sql). RLS em feedback_history já restringe
// o resultado a quem enxerga o content_item correspondente (mesmo client_id
// ou admin) — aqui só precisamos de uma sessão válida.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("feedback_history")
      .select("id, content_item_id, old_status, new_status, changed_by, changed_at, changed_by_user:users(id, email)")
      .eq("content_item_id", id)
      .order("changed_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const history: FeedbackHistoryEntry[] = (data ?? []).map((row) => ({
      id: row.id,
      content_item_id: row.content_item_id,
      old_status: row.old_status,
      new_status: row.new_status,
      changed_by: row.changed_by,
      changed_at: row.changed_at,
      changed_by_user: Array.isArray(row.changed_by_user)
        ? (row.changed_by_user[0] ?? null)
        : (row.changed_by_user ?? null),
    }));

    return NextResponse.json(history);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
