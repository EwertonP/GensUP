import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// Callback do fluxo OAuth Meta (Instagram/Facebook) iniciado a partir de /api/social-accounts.
// Troca o "code" pelo access_token e persiste em social_accounts.
// Implementação do exchangeCodeForToken depende das credenciais do Meta App (ver lib/meta-api).
export async function GET(req: NextRequest) {
  try {
    await requireRole(["agencia", "admin"]);
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code ausente" }, { status: 400 });

    // const token = await exchangeCodeForToken(code, redirectUri);
    // const supabase = await createClient();
    // await supabase.from("social_accounts").insert({ client_id: ctx.clientId, platform: "instagram", access_token: token.access_token });

    return NextResponse.json(
      { error: "OAuth Meta pendente de credenciais — ver lib/meta-api/index.ts" },
      { status: 501 }
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
