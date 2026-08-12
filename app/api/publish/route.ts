import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram, MetaApiError, MetaCredentialsError, type PublishMediaItem } from "@/lib/meta-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// GET/POST /api/publish
//
// Job de publicação automática (Fase 3) — busca content_items aprovados com
// scheduled_at vencido e ainda não publicados, publica cada um no Instagram
// via Graph API, e marca status='published' em caso de sucesso.
//
// Esta rota NÃO tem sessão de usuário (é chamada por um agendador, não por um
// browser autenticado) — protegida por isAuthorizedCronRequest (lib/cron-auth.ts).
// Sem CRON_SECRET configurado, a rota recusa todas as chamadas (fail-closed).
//
// Agendada via Vercel Cron (vercel.json, "crons": [{ "path": "/api/publish", ... }]) —
// Vercel só dispara GET e injeta automaticamente "Authorization: Bearer <CRON_SECRET>",
// por isso o GET abaixo existe além do POST (mantido para chamadas manuais/curl com
// x-cron-secret, ou um eventual Supabase Edge Function + pg_cron).
async function handlePublish(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: dueItems, error: fetchError } = await supabase
    .from("content_items")
    .select("id, client_id, type, caption, media_url")
    .eq("status", "approved")
    .is("published_at", null)
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", new Date().toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const item of dueItems ?? []) {
    try {
      const { data: socialAccount } = await supabase
        .from("social_accounts")
        .select("access_token, platform_account_id")
        .eq("client_id", item.client_id)
        .eq("platform", "instagram")
        .maybeSingle();

      if (!socialAccount?.access_token || !socialAccount.platform_account_id) {
        results.push({ id: item.id, ok: false, error: "Sem social_accounts.instagram conectado para este client" });
        continue; // não muda status — tenta de novo na próxima execução
      }

      let mediaItems: PublishMediaItem[];
      if (item.type === "carousel") {
        const { data: pages } = await supabase
          .from("content_pages")
          .select("media_url, page_number")
          .eq("content_item_id", item.id)
          .order("page_number", { ascending: true });
        mediaItems = (pages ?? []).map((p) => ({ mediaUrl: p.media_url }));
      } else if (item.media_url) {
        mediaItems = [{ mediaUrl: item.media_url, isVideo: item.type === "video" || item.type === "reel" }];
      } else {
        mediaItems = [];
      }

      if (mediaItems.length === 0) {
        results.push({ id: item.id, ok: false, error: "content_item sem media_url/content_pages" });
        continue;
      }

      const publishResult = await publishToInstagram(
        socialAccount.access_token,
        socialAccount.platform_account_id,
        mediaItems,
        item.caption ?? null
      );

      const { error: updateError } = await supabase
        .from("content_items")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", item.id);

      if (updateError) {
        results.push({ id: item.id, ok: false, error: `Publicado (${publishResult.mediaId}) mas falhou ao atualizar status: ${updateError.message}` });
        continue;
      }

      results.push({ id: item.id, ok: true });
    } catch (err) {
      // Nunca muda status em caso de erro — deixa para retry na próxima
      // execução do job em vez de perder o item.
      const message =
        err instanceof MetaCredentialsError || err instanceof MetaApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Erro desconhecido ao publicar";
      console.error(`[publish] falha ao publicar content_item ${item.id}:`, message);
      results.push({ id: item.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    checked: dueItems?.length ?? 0,
    published: results.filter((r) => r.ok).length,
    results,
  });
}

export async function GET(req: NextRequest) {
  return handlePublish(req);
}

export async function POST(req: NextRequest) {
  return handlePublish(req);
}
