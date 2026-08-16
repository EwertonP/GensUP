import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// RLS já restringe a linhas do mesmo client_id (ou todas, se admin/agencia).
// Pra admin, mescla banned_until (vem de auth.users, não de public.users) --
// usado pela tela /settings/users pra mostrar contas desativadas.
export async function GET() {
  try {
    const ctx = await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (ctx.role !== "admin" || !data || data.length === 0) {
      return NextResponse.json(data);
    }

    const adminClient = createAdminClient();
    const bannedById = new Map<string, string | null>();
    await Promise.all(
      data.map(async (user) => {
        const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);
        bannedById.set(user.id, authUser.user?.banned_until ?? null);
      })
    );

    const merged = data.map((user) => ({ ...user, banned_until: bannedById.get(user.id) ?? null }));
    return NextResponse.json(merged);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

// Criação real de conta acontece em POST /api/users/invite (admin client,
// convite por e-mail). Este endpoint nunca aceitou POST de fato -- só limpa
// a mensagem de erro pra apontar pro endpoint certo.
export async function POST() {
  return NextResponse.json({ error: "Use POST /api/users/invite para criar uma conta" }, { status: 501 });
}
