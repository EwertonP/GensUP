import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// RLS já restringe a linhas do mesmo client_id (ou todas, se admin)
export async function GET() {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  // Criação de usuário acontece via Supabase Auth signUp (trigger handle_new_user cria o profile).
  // Este endpoint existe apenas para admin criar usuários com role/client_id específicos via admin client.
  return NextResponse.json(
    { error: "Use auth.signUp no client, ou /api/auth/signin para provisionamento admin" },
    { status: 501 }
  );
}
