// Edge Function: agent-worker (Gensbot)
// Processa a fila de agent_tasks: pega a próxima tarefa 'pending', executa, grava agent_runs.
// Disparada por cron (ex: a cada minuto) ou webhook de INSERT em agent_tasks (pg_net/Database Webhooks).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: task, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!task) {
    return new Response(JSON.stringify({ processed: false, reason: "fila vazia" }), { status: 200 });
  }

  await supabase.from("agent_tasks").update({ status: "running" }).eq("id", task.id);

  // TODO: despachar por task.type e executar a lógica do agente (Gensbot)
  // Ao concluir, gravar em agent_runs (confidence, reasoning, outcome)
  // e atualizar agent_tasks.status para 'completed' ou 'failed'

  const { error: runError } = await supabase.from("agent_runs").insert({
    agent_task_id: task.id,
    confidence: null,
    reasoning: "agent-worker: lógica do agente ainda não implementada",
    outcome: "not_implemented",
  });

  await supabase
    .from("agent_tasks")
    .update({ status: "failed" })
    .eq("id", task.id);

  if (runError) {
    return new Response(JSON.stringify({ error: runError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ processed: true, task_id: task.id }), { status: 200 });
});
