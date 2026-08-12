import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestCaption, LlmCredentialsError, LlmApiError } from "@/lib/llm";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import type { AgentRunOutcome } from "@/lib/types/agent";

// GET/POST /api/agent-worker
//
// Worker da fila de trabalho autônoma do agente (Fase 5) -- reivindica UMA
// agent_task pendente via RPC claim_next_agent_task() (FOR UPDATE SKIP LOCKED,
// definida em supabase/migrations/013_sales_crm.sql -- supabase-js não expõe
// esse SQL diretamente), executa a lógica conforme `type`, e SEMPRE grava uma
// linha em agent_runs (mesmo em falha) -- transparência do raciocínio é o
// princípio central do produto: "nada é chutado".
//
// Protegida por isAuthorizedCronRequest (lib/cron-auth.ts), mesmo padrão de
// app/api/publish/route.ts. GET existe porque o Vercel Cron só dispara GET.
//
// Confiança sempre vira revisão humana nesta versão (outcome sempre
// 'sugerido_para_revisao'), mesmo quando confidence é alto -- não criamos
// nenhuma automação que notifique ou aja sozinha ainda (fase futura).
const SUGGESTED_FOR_REVIEW: AgentRunOutcome = "sugerido_para_revisao";
const ANOMALY_DROP_THRESHOLD = 0.3; // 30%
const ANOMALY_LOOKBACK_DAYS = 7;

async function handleAgentWorker(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: claimedTasks, error: claimError } = await supabase.rpc("claim_next_agent_task");

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 400 });
  }

  const task = claimedTasks?.[0];
  if (!task) {
    return NextResponse.json({ claimed: false, message: "Nenhuma task pendente" });
  }

  let finalStatus: "completed" | "failed" = "completed";
  let confidence: number | null = null;
  let reasoning = "";
  let outcome: AgentRunOutcome | string = SUGGESTED_FOR_REVIEW;

  try {
    if (task.type === "sugerir_legenda") {
      const payload = (task.payload ?? {}) as { content_item_id?: string; briefing?: string };
      if (!payload.content_item_id) {
        throw new Error("payload.content_item_id é obrigatório para type='sugerir_legenda'");
      }

      const { data: contentItem, error: contentItemError } = await supabase
        .from("content_items")
        .select("id, type, caption, suggested_caption, client_id, clients(name)")
        .eq("id", payload.content_item_id)
        .single();

      if (contentItemError || !contentItem) {
        throw new Error(`content_item ${payload.content_item_id} não encontrado`);
      }

      const clientName = (contentItem as unknown as { clients?: { name?: string } | null }).clients?.name;

      const result = await suggestCaption({
        contentType: contentItem.type,
        clientName,
        briefing: payload.briefing,
      });

      confidence = result.confidence;
      reasoning = `Prompt usado:\n${result.prompt}\n\nSugestão gerada: ${result.text}`;

      // Nunca sobrescreve caption já escrita por humano -- grava em
      // suggested_caption, um campo separado, só se ainda estiver vazio.
      if (!contentItem.suggested_caption) {
        const { error: updateError } = await supabase
          .from("content_items")
          .update({ suggested_caption: result.text })
          .eq("id", contentItem.id);
        if (updateError) {
          reasoning += `\n\n(Aviso: falha ao gravar suggested_caption: ${updateError.message})`;
        }
      } else {
        reasoning += "\n\n(content_items.suggested_caption já preenchido -- não sobrescrito)";
      }
    } else if (task.type === "checar_anomalia_insight") {
      const payload = (task.payload ?? {}) as { social_account_id?: string; metric?: string };
      if (!payload.social_account_id || !payload.metric) {
        throw new Error("payload.social_account_id e payload.metric são obrigatórios para type='checar_anomalia_insight'");
      }

      const { data: snapshots, error: snapshotsError } = await supabase
        .from("insights_snapshots")
        .select("value, snapshot_date")
        .eq("social_account_id", payload.social_account_id)
        .eq("metric", payload.metric)
        .order("snapshot_date", { ascending: false })
        .limit(ANOMALY_LOOKBACK_DAYS + 1);

      if (snapshotsError) {
        throw new Error(snapshotsError.message);
      }
      if (!snapshots || snapshots.length < 2) {
        throw new Error("Snapshots insuficientes para comparar (mínimo 2)");
      }

      const [latest, ...previous] = snapshots;
      const avgPrevious = previous.reduce((sum, s) => sum + Number(s.value), 0) / previous.length;
      const dropRatio = avgPrevious > 0 ? (avgPrevious - Number(latest.value)) / avgPrevious : 0;

      reasoning = `Métrica '${payload.metric}': snapshot mais recente (${latest.snapshot_date}) = ${latest.value}, média dos últimos ${previous.length} dias = ${avgPrevious.toFixed(2)}, queda = ${(dropRatio * 100).toFixed(1)}%.`;

      if (dropRatio > ANOMALY_DROP_THRESHOLD) {
        confidence = 0.8;
        reasoning += ` Queda > ${ANOMALY_DROP_THRESHOLD * 100}% detectada -- sinalizado como anomalia.`;
      } else {
        confidence = 0.8;
        reasoning += " Sem anomalia (queda dentro do esperado).";
      }
    } else {
      finalStatus = "failed";
      outcome = SUGGESTED_FOR_REVIEW;
      reasoning = `Tipo de task '${task.type}' não é suportado ainda pelo agent-worker.`;
    }
  } catch (err) {
    finalStatus = "failed";
    const message =
      err instanceof LlmCredentialsError || err instanceof LlmApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Erro desconhecido ao executar task";
    reasoning = `Falha ao processar task: ${message}`;
    console.error(`[agent-worker] falha ao processar task ${task.id} (${task.type}):`, message);
  }

  const { error: statusUpdateError } = await supabase
    .from("agent_tasks")
    .update({ status: finalStatus })
    .eq("id", task.id);

  if (statusUpdateError) {
    console.error(`[agent-worker] falha ao atualizar status da task ${task.id}:`, statusUpdateError.message);
  }

  // Sempre cria uma linha em agent_runs, mesmo em falha -- transparência do
  // raciocínio é o princípio central do produto.
  const { data: run, error: runInsertError } = await supabase
    .from("agent_runs")
    .insert({
      agent_task_id: task.id,
      confidence,
      reasoning,
      outcome,
    })
    .select()
    .single();

  if (runInsertError) {
    return NextResponse.json(
      { error: `Task ${task.id} processada (status=${finalStatus}) mas falhou ao gravar agent_run: ${runInsertError.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ claimed: true, task_id: task.id, status: finalStatus, run });
}

export async function GET(req: NextRequest) {
  return handleAgentWorker(req);
}

export async function POST(req: NextRequest) {
  return handleAgentWorker(req);
}
