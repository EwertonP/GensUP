import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";
import type { Role } from "@/lib/auth/roles";

const VALID_ROLES: Role[] = ["cliente", "agencia", "admin"];

// POST /api/users/invite -- cria a conta via convite por e-mail do Supabase
// Auth (usa service_role, ignora RLS). O trigger handle_new_user
// (004_triggers.sql) cria a linha em public.users a partir de
// raw_user_meta_data.{role,client_id}, então basta passar isso no invite.
// Substitui o placeholder 501 que existia em POST /api/users.
export async function POST(req: NextRequest) {
  try {
    await requireRole(["admin"]);
    const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string; client_id?: string };

    if (!body.email) {
      return NextResponse.json({ error: "email é obrigatório" }, { status: 400 });
    }
    const role = (body.role ?? "cliente") as Role;
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `role inválida. Use: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }
    if (role === "cliente" && !body.client_id) {
      return NextResponse.json({ error: "client_id é obrigatório para role=cliente" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(body.email, {
      data: { role, client_id: body.client_id ?? null },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data.user.id, email: data.user.email }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
