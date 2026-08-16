import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// PATCH /api/users/[id]/ban { banned: boolean } -- desativa/reativa a conta
// via Supabase Auth (ban_duration), sem precisar de coluna nova em
// public.users. "876000h" (~100 anos) é o valor usado pela própria doc do
// Supabase pra representar "banido indefinidamente"; "none" reativa.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { banned?: boolean };
    if (typeof body.banned !== "boolean") {
      return NextResponse.json({ error: "banned (boolean) é obrigatório" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(id, {
      ban_duration: body.banned ? "876000h" : "none",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, banned: body.banned });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
