import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

// Decisões tomadas em 2026-08-13 pra destravar a seção 1 do
// design/INFORMATION_ARCHITECTURE.md (perguntas 1 e parte da 3 do doc):
// - Feed granular (todo evento aparece), não agrupado por dia/tipo.
// - Limiar de "parado" = 3 dias, mesmo valor do StaleIndicator do Pipeline.
const STALE_DAYS = 3;
const FEED_LOOKBACK_DAYS = 14;
const FEED_LIMIT = 20;
const ANOMALY_LOOKBACK_DAYS = 7;
const ANOMALY_CONFIDENCE_THRESHOLD = 0.7;
const OPEN_PROSPECT_STAGE_FILTER = "(fechado,perdido)";

const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em aprovação",
  changes_requested: "Ajuste solicitado",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  email: "E-mail",
  ligacao: "Ligação",
  nota: "Nota",
  reuniao: "Reunião",
};

const AGENT_TASK_TYPE_LABELS: Record<string, string> = {
  sugerir_legenda: "Sugestão de legenda",
  checar_anomalia_insight: "Checagem de anomalia",
  pesquisar_prospect: "Pesquisa de prospect",
};

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

async function getKpis(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [activeClients, pendingApprovals, openProspects, monthlyClicks] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content_items").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    supabase.from("prospects").select("id", { count: "exact", head: true }).not("stage", "in", OPEN_PROSPECT_STAGE_FILTER),
    supabase.from("link_clicks").select("id", { count: "exact", head: true }).gte("clicked_at", startOfMonthISO()),
  ]);

  return {
    activeClients: activeClients.count ?? 0,
    pendingApprovals: pendingApprovals.count ?? 0,
    openProspects: openProspects.count ?? 0,
    monthlyClicks: monthlyClicks.count ?? 0,
  };
}

type FeedEvent = { id: string; timestamp: string; description: string };

async function getActivityFeed(supabase: Awaited<ReturnType<typeof createClient>>): Promise<FeedEvent[]> {
  const since = daysAgoISO(FEED_LOOKBACK_DAYS);

  const [statusChanges, activities, agentRuns, clicks] = await Promise.all([
    supabase
      .from("feedback_history")
      .select("id, changed_at, new_status, content_items(title, clients(name))")
      .gte("changed_at", since)
      .order("changed_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from("activities")
      .select("id, type, created_at, prospects(name), clients(name)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase
      .from("agent_runs")
      .select("id, outcome, created_at, agent_tasks(type, clients(name))")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase.from("link_clicks").select("clicked_at").gte("clicked_at", since),
  ]);

  const events: FeedEvent[] = [];

  for (const row of statusChanges.data ?? []) {
    const contentItem = row.content_items as unknown as { title: string | null; clients?: { name?: string } | null } | null;
    events.push({
      id: `status-${row.id}`,
      timestamp: row.changed_at,
      description: `${contentItem?.clients?.name ?? "—"}: peça "${contentItem?.title ?? "sem título"}" mudou para ${
        CONTENT_STATUS_LABELS[row.new_status] ?? row.new_status
      }`,
    });
  }

  for (const row of activities.data ?? []) {
    const prospect = row.prospects as unknown as { name?: string } | null;
    const client = row.clients as unknown as { name?: string } | null;
    events.push({
      id: `activity-${row.id}`,
      timestamp: row.created_at,
      description: `${ACTIVITY_TYPE_LABELS[row.type] ?? row.type} com ${prospect?.name ?? client?.name ?? "—"}`,
    });
  }

  for (const row of agentRuns.data ?? []) {
    if (row.outcome !== "sugerido_para_revisao" && row.outcome !== "aplicado") continue;
    const task = row.agent_tasks as unknown as { type: string; clients?: { name?: string } | null } | null;
    events.push({
      id: `agent-${row.id}`,
      timestamp: row.created_at,
      description: `Agente (${AGENT_TASK_TYPE_LABELS[task?.type ?? ""] ?? task?.type ?? "tarefa"}) para ${
        task?.clients?.name ?? "—"
      }: ${row.outcome === "aplicado" ? "aplicado automaticamente" : "sugerido para revisão"}`,
    });
  }

  const clicksByDay = new Map<string, number>();
  for (const row of clicks.data ?? []) {
    const day = row.clicked_at.slice(0, 10);
    clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
  }
  for (const [day, count] of clicksByDay) {
    events.push({
      id: `clicks-${day}`,
      timestamp: `${day}T12:00:00.000Z`,
      description: `${count} clique${count === 1 ? "" : "s"} em links`,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, FEED_LIMIT);
}

type PendingContentItem = { id: string; title: string | null; created_at: string; clientName: string };
type PendingProspect = { id: string; name: string; lastActivityAt: string };
type PendingAnomaly = { id: string; created_at: string; confidence: number | null; taskType: string; clientName: string };

async function getPendingItems(supabase: Awaited<ReturnType<typeof createClient>>) {
  const staleBefore = daysAgoISO(STALE_DAYS);
  const anomalySince = daysAgoISO(ANOMALY_LOOKBACK_DAYS);

  const [staleContent, openProspects, prospectActivities, anomalies] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, created_at, clients(name)")
      .eq("status", "in_review")
      .lt("created_at", staleBefore)
      .order("created_at", { ascending: true }),
    supabase
      .from("prospects")
      .select("id, name, created_at")
      .not("stage", "in", OPEN_PROSPECT_STAGE_FILTER),
    supabase
      .from("activities")
      .select("prospect_id, created_at")
      .not("prospect_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_runs")
      .select("id, confidence, created_at, agent_tasks(type, clients(name))")
      .eq("outcome", "sugerido_para_revisao")
      .gte("confidence", ANOMALY_CONFIDENCE_THRESHOLD)
      .gte("created_at", anomalySince)
      .order("created_at", { ascending: false }),
  ]);

  const lastActivityByProspect = new Map<string, string>();
  for (const row of prospectActivities.data ?? []) {
    if (!row.prospect_id) continue;
    if (!lastActivityByProspect.has(row.prospect_id)) lastActivityByProspect.set(row.prospect_id, row.created_at);
  }

  const staleProspects: PendingProspect[] = (openProspects.data ?? [])
    .map((p) => ({ id: p.id, name: p.name, lastActivityAt: lastActivityByProspect.get(p.id) ?? p.created_at }))
    .filter((p) => new Date(p.lastActivityAt).getTime() < new Date(staleBefore).getTime());

  const staleContentItems: PendingContentItem[] = (staleContent.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    clientName: (row.clients as unknown as { name?: string } | null)?.name ?? "—",
  }));

  const pendingAnomalies: PendingAnomaly[] = (anomalies.data ?? []).map((row) => {
    const task = row.agent_tasks as unknown as { type: string; clients?: { name?: string } | null } | null;
    return {
      id: row.id,
      created_at: row.created_at,
      confidence: row.confidence,
      taskType: AGENT_TASK_TYPE_LABELS[task?.type ?? ""] ?? task?.type ?? "tarefa",
      clientName: task?.clients?.name ?? "—",
    };
  });

  return { staleContentItems, staleProspects, pendingAnomalies };
}

export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const [kpis, feed, pending] = await Promise.all([getKpis(supabase), getActivityFeed(supabase), getPendingItems(supabase)]);

  const cards = [
    { label: "Clientes ativos", value: kpis.activeClients },
    { label: "Peças aguardando aprovação", value: kpis.pendingApprovals },
    { label: "Prospects em aberto", value: kpis.openProspects },
    { label: "Cliques em links no mês", value: kpis.monthlyClicks },
  ];

  const hasPending = pending.staleContentItems.length > 0 || pending.staleProspects.length > 0 || pending.pendingAnomalies.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-neutral-900">Pendências</h2>
          <p className="mt-1 text-xs text-neutral-400">Ação humana necessária</p>

          {!hasPending && <p className="mt-4 text-sm text-neutral-500">Nenhuma pendência no momento.</p>}

          {pending.staleContentItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium uppercase text-neutral-400">Peças paradas há mais de {STALE_DAYS} dias</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {pending.staleContentItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">
                      {item.clientName}: {item.title ?? "sem título"}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDate(item.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending.staleProspects.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium uppercase text-neutral-400">
                Prospects sem interação há mais de {STALE_DAYS} dias
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {pending.staleProspects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{p.name}</span>
                    <span className="text-xs text-neutral-400">{formatDate(p.lastActivityAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending.pendingAnomalies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium uppercase text-neutral-400">Anomalias sugeridas pelo agente</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {pending.pendingAnomalies.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">
                      {a.clientName}: {a.taskType}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDate(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-neutral-900">Atividade recente</h2>
          <p className="mt-1 text-xs text-neutral-400">Últimos {FEED_LOOKBACK_DAYS} dias, todos os clientes</p>

          {feed.length === 0 && <p className="mt-4 text-sm text-neutral-500">Nenhuma atividade recente.</p>}

          <ul className="mt-4 flex flex-col gap-3">
            {feed.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-neutral-700">{event.description}</span>
                <span className="shrink-0 text-xs text-neutral-400">{formatDateTime(event.timestamp)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
