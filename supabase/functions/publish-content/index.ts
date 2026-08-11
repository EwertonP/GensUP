// Edge Function: publish-content
// Publica um content_item aprovado (status = 'scheduled') na plataforma social correspondente.
// Disparada por cron/scheduler (fora do escopo da Fase 0) ou manualmente por uma rota admin futura.
//
// Como sync-insights (ver esse arquivo para o padrao completo), `verify_jwt` continua
// `true` (padrao do Supabase CLI, nenhuma secao [functions.publish-content] em
// supabase/config.toml) -- a URL publica aceita qualquer JWT de usuario autenticado.
// A logica de publicacao de verdade hoje vive em app/api/publish/route.ts (protegida
// por CRON_SECRET, roda com service_role via createAdminClient), nao nesta function --
// mas esta function continua alcancavel publicamente enquanto existir, entao precisa da
// mesma defesa em profundidade: JWT valido + role agencia/admin antes de tocar em
// qualquer dado. Ver docs/security/REVIEW_FASE1.md, achado #1.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return json({ error: "Authorization ausente" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: callerData, error: callerError } = await admin.auth.getUser(jwt);
  if (callerError || !callerData?.user) {
    return json({ error: "JWT invalido ou expirado" }, 401);
  }

  const appMetadata = (callerData.user.app_metadata ?? {}) as { role?: string; client_id?: string };
  const callerRole = appMetadata.role;
  const callerClientId = appMetadata.client_id;

  if (callerRole !== "agencia" && callerRole !== "admin") {
    return json({ error: "Requer role agencia ou admin" }, 403);
  }

  let body: { content_item_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body invalido" }, 400);
  }

  const { content_item_id } = body;
  if (!content_item_id) {
    return json({ error: "content_item_id e obrigatorio" }, 400);
  }

  const { data: item, error } = await admin
    .from("content_items")
    .select("id, client_id, status")
    .eq("id", content_item_id)
    .single();

  if (error || !item) {
    return json({ error: "Item nao encontrado" }, 404);
  }

  if (callerRole !== "admin" && item.client_id !== callerClientId) {
    return json({ error: "content_item nao pertence ao seu client_id" }, 403);
  }

  if (item.status !== "scheduled") {
    return json({ error: `Item precisa estar 'scheduled', esta '${item.status}'` }, 400);
  }

  // TODO: publicar via Graph API usando a social_account correspondente
  // TODO: em sucesso, update content_items.status = 'published'

  return json({ published: false, reason: "not implemented" }, 501);
});
