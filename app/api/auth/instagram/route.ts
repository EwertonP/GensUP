import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

const OAUTH_DIALOG_URL = "https://www.facebook.com/v21.0/dialog/oauth";

// Escopo mínimo para Instagram Business Login via Facebook Login for Business:
// listar Pages do usuário e ler insights da Instagram Business Account vinculada.
const SCOPES = ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"].join(
  ","
);

// GET /api/auth/instagram
// Inicia o fluxo OAuth do Instagram Business (via Facebook Login). Só
// agência/admin podem conectar uma conta social (mesma regra de
// /api/social-accounts). Redireciona para o dialog de autorização da Meta;
// /api/auth/instagram/callback troca o "code" retornado pelo access_token.
export async function GET() {
  try {
    await requireRole(["agencia", "admin"]);

    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI;
    if (!appId || !redirectUri) {
      return NextResponse.json(
        {
          error:
            "OAuth Instagram pendente de credenciais Meta (META_APP_ID/META_REDIRECT_URI não configurados) — ver lib/meta-api/index.ts",
        },
        { status: 501 }
      );
    }

    const authorizeUrl = new URL(OAUTH_DIALOG_URL);
    authorizeUrl.searchParams.set("client_id", appId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", SCOPES);
    authorizeUrl.searchParams.set("response_type", "code");

    return NextResponse.redirect(authorizeUrl.toString());
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
