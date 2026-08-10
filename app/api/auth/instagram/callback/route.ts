import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";
import {
  exchangeCodeForToken,
  findInstagramBusinessAccount,
  MetaApiError,
  MetaCredentialsError,
} from "@/lib/meta-api";

// GET /api/auth/instagram/callback
// Callback do dialog OAuth iniciado em /api/auth/instagram. Troca o "code" por
// um access_token, descobre a Instagram Business Account vinculada à Page do
// usuário, e grava/atualiza a linha correspondente em social_accounts para o
// client_id do usuário autenticado (nunca aceita client_id vindo de fora —
// mesmo padrão de lib/auth/middleware.ts descrito em MULTI_TENANT.md).
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole(["agencia", "admin"]);

    const oauthError = req.nextUrl.searchParams.get("error_description") ?? req.nextUrl.searchParams.get("error");
    if (oauthError) {
      return NextResponse.json({ error: `Autorização negada pela Meta: ${oauthError}` }, { status: 400 });
    }

    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code ausente" }, { status: 400 });

    if (!ctx.clientId) {
      return NextResponse.json({ error: "Usuário sem client_id associado" }, { status: 403 });
    }

    const redirectUri = process.env.META_REDIRECT_URI;
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !redirectUri) {
      return NextResponse.json(
        {
          error:
            "OAuth Instagram pendente de credenciais Meta (META_APP_ID/META_APP_SECRET/META_REDIRECT_URI) — ver lib/meta-api/index.ts",
        },
        { status: 501 }
      );
    }

    let igAccount;
    try {
      const { accessToken } = await exchangeCodeForToken(code, redirectUri);
      igAccount = await findInstagramBusinessAccount(accessToken);
    } catch (metaErr) {
      if (metaErr instanceof MetaCredentialsError) {
        return NextResponse.json({ error: metaErr.message }, { status: 501 });
      }
      if (metaErr instanceof MetaApiError) {
        return NextResponse.json({ error: metaErr.message }, { status: 502 });
      }
      throw metaErr;
    }

    const supabase = await createClient();

    // Evita duplicar a linha em reconexões: mesma (client_id, platform,
    // platform_account_id) atualiza o token existente em vez de inserir outra.
    const { data: existing } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("client_id", ctx.clientId)
      .eq("platform", "instagram")
      .eq("platform_account_id", igAccount.igUserId)
      .maybeSingle();

    const payload = {
      client_id: ctx.clientId,
      platform: "instagram" as const,
      platform_account_id: igAccount.igUserId,
      access_token: igAccount.pageAccessToken,
    };

    const { data, error: dbError } = existing
      ? await supabase
          .from("social_accounts")
          .update(payload)
          .eq("id", existing.id)
          .select("id, client_id, platform, last_sync, created_at")
          .single()
      : await supabase
          .from("social_accounts")
          .insert(payload)
          .select("id, client_id, platform, last_sync, created_at")
          .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });

    return NextResponse.json({ connected: true, social_account: data });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
