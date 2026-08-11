// Edge Function: agent-worker (Gensbot)
// Processa a fila de agent_tasks: pega a proxima tarefa 'pending', executa, grava agent_runs.
// Disparada por cron (ex: a cada minuto) ou webhook de INSERT em agent_tasks (pg_net/Database Webhooks).
//
// Como sync-insights/publish-content (ver esses arquivos para o padrao completo),
// `verify_jwt` continua `true` (padrao do Supabase CLI, nenhuma secao
// [functions.agent-worker] em supabase/config.toml) -- a URL publica aceita qualquer JWT
// de usuario autenticado. Diferente das outras duas functions, esta nao recebe um id de
// recurso no body (processa a fila inteira, cross-tenant, por design -- e um worker
// interno), entao nao ha "posse de recurso" para validar aqui; a unica defesa possivel e
// restringir quem pode disparar o processamento. So admin (tipicamente o proprio
// scheduler/cron, autenticado com um usuario de servico) pode chamar esta function.
// Ver docs/security/REVIEW_FASE1.md, achado #1.

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

  const appMetadata = (callerData.user.app_metadata ?? {}) as { role?: string };
  if (appMetadata.role !== "admin") {
    return json({ error: "Requer role admin" }, 403);
  }

  const { data: task, error } = await admin
    .from("agent_tasks")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }
  if (!task) {
    return json({ processed: false, reason: "fila vazia" }, 200);
  }

  await admin.from("agent_tasks").update({ status: "running" }).eq("id", task.id);

  // TODO: despachar por task.type e executar a logica do agente (Gensbot)
  // Ao concluir, gravar em agent_runs (confidence, reasoning, outcome)
  // e atualizar agent_tasks.status para 'completed' ou 'failed'

  const { error: runError } = await admin.from("agent_runs").insert({
    agent_task_id: task.id,
    confidence: null,
    reasoning: "agent-worker: logica do agente ainda nao implementada",
    outcome: "not_implemented",
  });

  await admin
    .from("agent_tasks")
    .update({ status: "failed" })
    .eq("id", task.id);

  if (runError) {
    return json({ error: runError.message }, 500);
  }

  return json({ processed: true, task_id: task.id }, 200);
});
