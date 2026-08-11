// Wrapper da Meta Graph API — Instagram Business (via Facebook Login for Business).
//
// Escopo: troca de "code" OAuth por access_token de longa duração, descoberta da
// Instagram Business Account vinculada à Page do usuário, e coleta de métricas
// de insights para popular `insights_snapshots`.
//
// Todas as funções exigem META_APP_ID/META_APP_SECRET configuradas (ver
// .env.example). Sem elas, lançam MetaCredentialsError — o caller (rota Next.js)
// deve capturar e responder 501 "pendente de credenciais Meta", no mesmo padrão
// de lib/email/resend.ts (nunca deixar a rota quebrar com erro genérico 500).

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class MetaCredentialsError extends Error {
  constructor(message = "Credenciais Meta (META_APP_ID/META_APP_SECRET) não configuradas") {
    super(message);
    this.name = "MetaCredentialsError";
  }
}

export class MetaApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "MetaApiError";
    this.status = status;
  }
}

function getCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new MetaCredentialsError();
  return { appId, appSecret };
}

interface GraphErrorBody {
  error?: { message?: string };
}

async function graphFetch<T>(url: URL): Promise<T> {
  const res = await fetch(url.toString());
  const body = (await res.json().catch(() => ({}))) as T & GraphErrorBody;
  if (!res.ok) {
    throw new MetaApiError(body?.error?.message ?? `Falha na chamada à Graph API (${url.pathname})`, res.status);
  }
  return body;
}

export interface ExchangedToken {
  accessToken: string;
  expiresIn: number | null; // segundos; null quando a API não retorna
}

// Troca o "code" recebido no redirect OAuth por um token de curta duração e, em
// seguida, pelo token de longa duração (~60 dias) — é esse último que deve ser
// persistido (indiretamente: ver findInstagramBusinessAccount, que retorna o
// token da Page, que é o que efetivamente é gravado em social_accounts).
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<ExchangedToken> {
  const { appId, appSecret } = getCredentials();

  const shortLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  shortLivedUrl.searchParams.set("client_id", appId);
  shortLivedUrl.searchParams.set("client_secret", appSecret);
  shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
  shortLivedUrl.searchParams.set("code", code);

  const shortLived = await graphFetch<{ access_token?: string }>(shortLivedUrl);
  if (!shortLived.access_token) {
    throw new MetaApiError("Resposta sem access_token ao trocar code");
  }

  const longLivedUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  const longLived = await graphFetch<{ access_token?: string; expires_in?: number }>(longLivedUrl);
  if (!longLived.access_token) {
    throw new MetaApiError("Resposta sem access_token ao obter token de longa duração");
  }

  return {
    accessToken: longLived.access_token,
    expiresIn: typeof longLived.expires_in === "number" ? longLived.expires_in : null,
  };
}

export interface InstagramBusinessAccount {
  igUserId: string;
  pageId: string;
  pageAccessToken: string;
}

// A partir do token do usuário (obtido em exchangeCodeForToken), encontra a
// primeira Page administrada pelo usuário que tem uma Instagram Business
// Account vinculada. O token da Page (não o do usuário) é o que deve ser usado
// nas chamadas de insights — é ele que fica salvo em social_accounts.access_token.
export async function findInstagramBusinessAccount(userAccessToken: string): Promise<InstagramBusinessAccount> {
  getCredentials();

  const pagesUrl = new URL(`${GRAPH_API_BASE}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account");
  pagesUrl.searchParams.set("access_token", userAccessToken);

  const pages = await graphFetch<{
    data?: Array<{ id: string; access_token: string; instagram_business_account?: { id: string } }>;
  }>(pagesUrl);

  const pageWithIg = (pages.data ?? []).find((page) => page.instagram_business_account?.id);
  if (!pageWithIg?.instagram_business_account) {
    throw new MetaApiError("Nenhuma Instagram Business Account vinculada às Pages do usuário");
  }

  return {
    igUserId: pageWithIg.instagram_business_account.id,
    pageId: pageWithIg.id,
    pageAccessToken: pageWithIg.access_token,
  };
}

export interface InsightMetric {
  metric: string;
  value: number;
  snapshot_date: string; // YYYY-MM-DD, compatível com insights_snapshots.snapshot_date
}

// Métricas de conta (period=day) da Instagram Graph API mapeadas para o
// vocabulário em português usado em insights_snapshots.metric.
const ACCOUNT_METRICS = ["reach", "impressions", "total_interactions", "profile_views"] as const;

const METRIC_NAME_MAP: Record<string, string> = {
  reach: "alcance",
  impressions: "impressoes",
  total_interactions: "engajamento",
  profile_views: "visualizacoes_perfil",
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Busca alcance, impressões, engajamento (total_interactions) e visualizações
// de perfil via /{igUserId}/insights, mais seguidores via
// /{igUserId}?fields=followers_count. Retorna um snapshot "hoje" por métrica,
// já no formato pronto para upsert em insights_snapshots (metric/value/snapshot_date).
//
// Nota para o Frontend: `metric` é sempre uma destas chaves em português
// (alcance | impressoes | engajamento | visualizacoes_perfil | seguidores);
// `value` é sempre numeric (contagem absoluta, não percentual).
export async function fetchAccountInsights(accessToken: string, igUserId: string): Promise<InsightMetric[]> {
  getCredentials();

  const snapshotDate = todayISODate();
  const results: InsightMetric[] = [];

  const insightsUrl = new URL(`${GRAPH_API_BASE}/${igUserId}/insights`);
  insightsUrl.searchParams.set("metric", ACCOUNT_METRICS.join(","));
  insightsUrl.searchParams.set("period", "day");
  insightsUrl.searchParams.set("access_token", accessToken);

  const insights = await graphFetch<{
    data?: Array<{ name: string; values?: Array<{ value: number }> }>;
  }>(insightsUrl);

  for (const entry of insights.data ?? []) {
    const latestValue = entry.values?.[entry.values.length - 1]?.value;
    if (typeof latestValue === "number") {
      results.push({
        metric: METRIC_NAME_MAP[entry.name] ?? entry.name,
        value: latestValue,
        snapshot_date: snapshotDate,
      });
    }
  }

  const accountUrl = new URL(`${GRAPH_API_BASE}/${igUserId}`);
  accountUrl.searchParams.set("fields", "followers_count");
  accountUrl.searchParams.set("access_token", accessToken);

  const account = await graphFetch<{ followers_count?: number }>(accountUrl);
  if (typeof account.followers_count === "number") {
    results.push({ metric: "seguidores", value: account.followers_count, snapshot_date: snapshotDate });
  }

  return results;
}

// =========================================================
// Publicação automática (Fase 3) — ver app/api/publish/route.ts.
//
// Publicar no Instagram via Graph API é sempre 2 passos:
//   1) criar um "media container": POST /{ig-user-id}/media
//      - imagem única: image_url + caption
//      - carrossel: um container por página (children[]) + um container pai
//        com media_type=CAROUSEL + children (lista de creation_id)
//   2) publicar o container: POST /{ig-user-id}/media_publish com creation_id
//
// graphFetch já lança MetaApiError em qualquer resposta não-2xx — o caller
// (rota de publicação) deve capturar e decidir se tenta de novo depois.
// =========================================================

async function graphPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}/${path}`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as T & GraphErrorBody;
  if (!res.ok) {
    throw new MetaApiError(body?.error?.message ?? `Falha na chamada à Graph API (POST ${path})`, res.status);
  }
  return body;
}

export interface PublishMediaItem {
  mediaUrl: string;
  isVideo?: boolean; // reels/video — usa video_url em vez de image_url no container
}

export interface PublishResult {
  mediaId: string; // id do post publicado no Instagram (retorno de media_publish)
}

// Publica uma imagem/vídeo único. Para carrossel, use publishCarousel.
async function publishSingleMedia(
  accessToken: string,
  igUserId: string,
  item: PublishMediaItem,
  caption: string | null
): Promise<string> {
  const containerParams: Record<string, string> = {
    access_token: accessToken,
  };
  if (item.isVideo) {
    containerParams.video_url = item.mediaUrl;
    containerParams.media_type = "REELS";
  } else {
    containerParams.image_url = item.mediaUrl;
  }
  if (caption) containerParams.caption = caption;

  const container = await graphPost<{ id?: string }>(`${igUserId}/media`, containerParams);
  if (!container.id) throw new MetaApiError("Resposta sem id ao criar media container");
  return container.id;
}

// Publica um carrossel: cria um container por item (is_carousel_item=true),
// depois um container pai (media_type=CAROUSEL, children=<ids>).
async function publishCarouselContainers(
  accessToken: string,
  igUserId: string,
  items: PublishMediaItem[],
  caption: string | null
): Promise<string> {
  const childIds: string[] = [];
  for (const item of items) {
    const childParams: Record<string, string> = {
      access_token: accessToken,
      is_carousel_item: "true",
    };
    if (item.isVideo) {
      childParams.video_url = item.mediaUrl;
      childParams.media_type = "VIDEO";
    } else {
      childParams.image_url = item.mediaUrl;
    }
    const child = await graphPost<{ id?: string }>(`${igUserId}/media`, childParams);
    if (!child.id) throw new MetaApiError("Resposta sem id ao criar container de item do carrossel");
    childIds.push(child.id);
  }

  const parentParams: Record<string, string> = {
    access_token: accessToken,
    media_type: "CAROUSEL",
    children: childIds.join(","),
  };
  if (caption) parentParams.caption = caption;

  const parent = await graphPost<{ id?: string }>(`${igUserId}/media`, parentParams);
  if (!parent.id) throw new MetaApiError("Resposta sem id ao criar container pai do carrossel");
  return parent.id;
}

// Publica media (imagem/vídeo único ou carrossel, dependendo de items.length)
// no Instagram Business Account igUserId, usando o access_token da Page
// (persistido em social_accounts.access_token). Retorna o id do post final.
export async function publishToInstagram(
  accessToken: string,
  igUserId: string,
  items: PublishMediaItem[],
  caption: string | null
): Promise<PublishResult> {
  getCredentials();

  if (items.length === 0) {
    throw new MetaApiError("Nenhuma mídia para publicar (media_url/content_pages vazio)");
  }

  const creationId =
    items.length === 1
      ? await publishSingleMedia(accessToken, igUserId, items[0], caption)
      : await publishCarouselContainers(accessToken, igUserId, items, caption);

  const publish = await graphPost<{ id?: string }>(`${igUserId}/media_publish`, {
    access_token: accessToken,
    creation_id: creationId,
  });
  if (!publish.id) throw new MetaApiError("Resposta sem id ao publicar (media_publish)");

  return { mediaId: publish.id };
}

export { GRAPH_API_BASE };
