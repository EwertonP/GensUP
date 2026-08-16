import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

const METRIC_LABELS: Record<string, string> = {
  alcance: "Alcance",
  impressoes: "Impressões",
  engajamento: "Engajamento",
  seguidores: "Seguidores",
};
const CUMULATIVE_METRICS = new Set(["alcance", "impressoes", "engajamento"]);
const LOOKBACK_DAYS = 30;

function daysAgoDateOnly(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

interface ClientRow {
  clientId: string;
  clientName: string;
  metrics: Record<string, number>;
}

async function getClientMetrics(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ClientRow[]> {
  const [{ data: clients }, { data: accounts }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("status", "active"),
    supabase.from("social_accounts").select("id, client_id"),
  ]);

  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return [];

  const { data: snapshots } = await supabase
    .from("insights_snapshots")
    .select("social_account_id, metric, value")
    .in("social_account_id", accountIds)
    .gte("snapshot_date", daysAgoDateOnly(LOOKBACK_DAYS));

  const clientIdByAccountId = new Map((accounts ?? []).map((a) => [a.id, a.client_id]));

  // Acumula sums/counts por (client_id, metric) pra depois decidir soma vs. média.
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const row of snapshots ?? []) {
    const clientId = clientIdByAccountId.get(row.social_account_id);
    if (!clientId) continue;
    const key = `${clientId}:${row.metric}`;
    sums.set(key, (sums.get(key) ?? 0) + row.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (clients ?? []).map((client) => {
    const metrics: Record<string, number> = {};
    for (const metric of Object.keys(METRIC_LABELS)) {
      const key = `${client.id}:${metric}`;
      if (!sums.has(key)) continue;
      metrics[metric] = CUMULATIVE_METRICS.has(metric) ? sums.get(key)! : sums.get(key)! / counts.get(key)!;
    }
    return { clientId: client.id, clientName: client.name, metrics };
  });
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Visão cross-cliente das métricas (design/INFORMATION_ARCHITECTURE.md
// seção 6.2) -- /insights (portal do cliente) é sempre de um cliente por vez;
// esta tela compara todos os clientes ativos lado a lado, últimos 30 dias.
export async function InsightsOverview() {
  const supabase = await createClient();
  const rows = (await getClientMetrics(supabase)).sort(
    (a, b) => (b.metrics.alcance ?? 0) - (a.metrics.alcance ?? 0)
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Insights agregados</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Comparativo entre clientes ativos, últimos {LOOKBACK_DAYS} dias.
        </p>
      </div>

      {rows.length === 0 && (
        <Card className="p-6 text-sm text-neutral-500">
          Nenhum cliente ativo com contas sociais conectadas e dados de insights nesse período.
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <th key={key} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientId} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.clientName}</td>
                  {Object.keys(METRIC_LABELS).map((metric) => (
                    <td key={metric} className="px-4 py-3 text-neutral-600">
                      {formatNumber(row.metrics[metric])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
