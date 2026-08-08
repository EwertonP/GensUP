import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

const VALID_STATUSES = ["draft", "in_review", "changes_requested", "approved", "scheduled", "published"] as const;
type Status = (typeof VALID_STATUSES)[number];

// Transições permitidas por role. RLS garante isolamento por client_id;
// esta camada valida a regra de negócio (quem pode mover o item para onde).
const TRANSITIONS: Record<Status, { from: Status[]; roles: string[] }> = {
  draft: { from: [], roles: ["agencia", "admin"] },
  in_review: { from: ["draft", "changes_requested"], roles: ["agencia", "admin"] },
  changes_requested: { from: ["in_review"], roles: ["cliente", "agencia", "admin"] },
  approved: { from: ["in_review"], roles: ["cliente", "admin"] },
  scheduled: { from: ["approved"], roles: ["agencia", "admin"] },
  published: { from: ["scheduled"], roles: ["agencia", "admin"] },
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const { status } = (await req.json()) as { status: Status };

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: current, error: fetchError } = await supabase
      .from("content_items")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

    const rule = TRANSITIONS[status];
    if (!rule.roles.includes(ctx.role)) {
      return NextResponse.json({ error: `Role ${ctx.role} não pode mover para ${status}` }, { status: 403 });
    }
    if (!rule.from.includes(current.status as Status)) {
      return NextResponse.json(
        { error: `Transição inválida: ${current.status} → ${status}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_items")
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
