// Edge Function: sync-insights
// Chamada por POST /api/insights/sync (route handler já valida role + posse do
// recurso via RLS antes de disparar). Mas `verify_jwt` continua `true` (padrão
// do Supabase CLI) e a URL pública `https://<project>.functions.supabase.co/sync-insights`
// aceita qualquer JWT de usuário autenticado — logo esta function NÃO pode
// confiar apenas na rota Next.js. Ver docs/security/REVIEW_FASE1.md, achado #1.
//
// Por isso, antes de tocar o service_role em qualquer coisa, a function:
//   1. exige um Authorization: Bearer <jwt> válido;
//   2. valida esse JWT contra o Auth server (admin.auth.getUser), nunca decodificando
//      localmente (não verificaria assinatura/expiração);
//   3. exige role agencia/admin;
//   4. para role agencia, exige que a social_account pertença ao client_id do chamador
//      (lido de app_metadata, o mesmo claim usado pelas policies de RLS — ver
//      docs/backend/MULTI_TENANT.md). admin (role pura) pode operar cross-tenant.
// Qualquer falha nessas checagens retorna 401/403 antes de qualquer leitura/escrita.
//
// Fluxo (após autorizado): busca social_accounts.access_token/platform_account_id ->
// chama Instagram Graph API -> upsert em insights_snapshots por
// (social_account_id, snapshot_date, metric) -> atualiza social_accounts.last_sync.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_ID = Deno.env.get("META_APP_ID");
const META_APP_SECRET = Deno.env.get("META_APP_SECRET");

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // --- 1/2. Autenticação: JWT do chamador, validado contra o Auth server ---
  const authHeader = req.headers.get("Authorization");
  const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return json({ error: "Authorization ausente" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerData, error: callerError } = await admin.auth.getUser(jwt);
  if (callerError || !callerData?.user) {
    return json({ error: "JWT inválido ou expirado" }, 401);
  }

  const appMetadata = (callerData.user.app_metadata ?? {}) as { role?: string; client_id?: string };
  const callerRole = appMetadata.role;
  const callerClientId = appMetadata.client_id;

  // --- 3. Role ---
  if (callerRole !== "agencia" && callerRole !== "admin") {
    return json({ error: "Requer role agencia ou admin" }, 403);
  }

  let body: { social_account_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const { social_account_id } = body;
  if (!social_account_id) {
    return json({ error: "social_account_id é obrigatório" }, 400);
  }

  const { data: account, error } = await admin
    .from("social_accounts")
    .select("id, client_id, platform, platform_account_id, access_token")
    .eq("id", social_account_id)
    .single();

  if (error || !account) {
    return json({ error: "Conta não encontrada" }, 404);
  }

  // --- 4. Posse do recurso (agencia só sincroniza contas do próprio client_id) ---
  if (callerRole !== "admin" && account.client_id !== callerClientId) {
    return json({ error: "Conta social não pertence ao seu client_id" }, 403);
  }

  if (account.platform !== "instagram") {
    return json({ error: `Plataforma "${account.platform}" ainda não suportada pelo sync` }, 501);
  }

  if (!account.access_token || !account.platform_account_id) {
    return json(
      {
        error:
          "access_token/platform_account_id ausente — conecte a conta via /api/auth/instagram antes de sincronizar",
      },
      501
    );
  }

  if (!META_APP_ID || !META_APP_SECRET) {
    return json({ error: "access_token ausente — pendente de credenciais Meta" }, 501);
  }

  try {
    const metrics = await fetchAccountInsights(account.access_token, account.platform_account_id);

    const rows = metrics.map((m) => ({
      social_account_id: account.id,
      snapshot_date: m.snapshot_date,
      metric: m.metric,
      value: m.value,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("insights_snapshots")
        .upsert(rows, { onConflict: "social_account_id,snapshot_date,metric" });

      if (upsertError) {
        return json({ error: upsertError.message }, 500);
      }
    }

    const { error: touchError } = await admin
      .from("social_accounts")
      .update({ last_sync: new Date().toISOString() })
      .eq("id", account.id);

    if (touchError) {
      return json({ error: touchError.message }, 500);
    }

    return json({ synced: true, metrics: rows.length }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Falha ao sincronizar insights" }, 502);
  }
});

// --- Meta Graph API ---------------------------------------------------------
// Reimplementação mínima de lib/meta-api/index.ts::fetchAccountInsights.
// Edge Functions rodam em Deno e não importam módulos do app Next.js
// diretamente, então a lógica é duplicada aqui. Mantenha as duas em sincronia
// (mesmas métricas, mesmo mapeamento de nomes) se algo mudar.

interface InsightMetric {
  metric: string;
  value: number;
  snapshot_date: string;
}

const ACCOUNT_METRICS = ["reach", "impressions", "total_interactions", "profile_views"];

const METRIC_NAME_MAP: Record<string, string> = {
  reach: "alcance",
  impressions: "impressoes",
  total_interactions: "engajamento",
  profile_views: "visualizacoes_perfil",
};

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function graphFetch<T>(url: URL): Promise<T> {
  const res = await fetch(url.toString());
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Falha na chamada à Graph API (${url.pathname})`);
  }
  return body;
}

async function fetchAccountInsights(accessToken: string, igUserId: string): Promise<InsightMetric[]> {
  const snapshotDate = todayISODate();
  const results: InsightMetric[] = [];

  const insightsUrl = new URL(`${GRAPH_API_BASE}/${igUserId}/insights`);
  insightsUrl.searchParams.set("metric", ACCOUNT_METRICS.join(","));
  insightsUrl.searchParams.set("period", "day");
  insightsUrl.searchParams.set("access_token", accessToken);

  const insights = await graphFetch<{ data?: Array<{ name: string; values?: Array<{ value: number }> }> }>(
    insightsUrl
  );

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

  const accountInfo = await graphFetch<{ followers_count?: number }>(accountUrl);
  if (typeof accountInfo.followers_count === "number") {
    results.push({ metric: "seguidores", value: accountInfo.followers_count, snapshot_date: snapshotDate });
  }

  return results;
}
