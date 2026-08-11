import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

const VALID_STATUSES = ["open", "resolved"] as const;

// Unico campo editavel: status (open -> resolved). RLS
// (carousel_feedback_update_same_client, supabase/migrations/011_feedback_resolve_policies.sql)
// ja restringe a linhas do mesmo client_id do content_item pai -- aqui so limitamos o
// shape do update para nao permitir reescrever page_number/comment/created_by.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const status = body?.status;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "status deve ser open ou resolved" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("carousel_feedback")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
