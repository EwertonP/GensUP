"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { InsightSnapshot } from "@/lib/types/insights";

interface InsightsDashboardProps {
  socialAccountId: string;
  canSync: boolean;
}

async function fetchInsights(socialAccountId: string): Promise<InsightSnapshot[]> {
  const res = await fetch(`/api/insights?social_account_id=${encodeURIComponent(socialAccountId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao carregar insights");
  }
  return res.json();
}

async function triggerSync(socialAccountId: string): Promise<void> {
  const res = await fetch("/api/insights/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ social_account_id: socialAccountId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao sincronizar");
  }
}

const METRIC_LABELS: Record<string, string> = {
  alcance: "Alcance",
  impressoes: "Impressões",
  engajamento: "Engajamento",
  visualizacoes_perfil: "Visualizações de perfil",
  seguidores: "Seguidores",
};

function formatMetricLabel(metric: string): string {
  return (
    METRIC_LABELS[metric] ??
    metric
      .split("_")
      .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
      .join(" ")
  );
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface MetricChartProps {
  metric: string;
  points: InsightSnapshot[];
}

// Gráfico de linha simples em SVG (sem lib de chart, conforme padrão atual do projeto).
function MetricLineChart({ metric, points }: MetricChartProps) {
  const width = 320;
  const height = 96;
  const paddingX = 8;
  const paddingY = 12;

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)),
    [points]
  );

  const values = sorted.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = sorted.map((p, i) => {
    const x =
      sorted.length === 1
        ? width / 2
        : paddingX + (i / (sorted.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((p.value - min) / range) * (height - paddingY * 2);
    return { x, y };
  });

  return (
    <Card className="flex flex-col gap-2 p-4">
      <h3 className="text-sm font-medium text-neutral-700">{formatMetricLabel(metric)}</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-neutral-400">Sem histórico ainda.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-label={`Histórico de ${metric}`}>
            <polyline
              points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
            />
            {coords.map((c, i) => (
              <circle key={sorted[i].id} cx={c.x} cy={c.y} r={2.5} fill="#2563eb" />
            ))}
          </svg>
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>{formatDate(sorted[0].snapshot_date)}</span>
            <span>{formatDate(sorted[sorted.length - 1].snapshot_date)}</span>
          </div>
        </>
      )}
    </Card>
  );
}

export function InsightsDashboard({ socialAccountId, canSync }: InsightsDashboardProps) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ["insights", socialAccountId];

  const insightsQuery = useQuery({
    queryKey,
    queryFn: () => fetchInsights(socialAccountId),
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerSync(socialAccountId),
    onSuccess: () => {
      setSyncMessage(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      setSyncMessage(err instanceof Error ? err.message : "Falha ao sincronizar");
    },
  });

  const snapshots = useMemo(() => insightsQuery.data ?? [], [insightsQuery.data]);

  const byMetric = useMemo(() => {
    const map = new Map<string, InsightSnapshot[]>();
    for (const snapshot of snapshots) {
      const list = map.get(snapshot.metric) ?? [];
      list.push(snapshot);
      map.set(snapshot.metric, list);
    }
    return map;
  }, [snapshots]);

  // A API retorna ordenado por snapshot_date desc, então o primeiro item de cada
  // grupo já é o valor mais recente daquela métrica.
  const latestByMetric = useMemo(() => {
    const result: InsightSnapshot[] = [];
    for (const list of byMetric.values()) {
      if (list.length > 0) result.push(list[0]);
    }
    return result.sort((a, b) => a.metric.localeCompare(b.metric));
  }, [byMetric]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Métricas</h2>
        {canSync && (
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="secondary"
              onClick={() => {
                setSyncMessage(null);
                syncMutation.mutate();
              }}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
            {syncMessage && <p className="text-xs text-status-error">{syncMessage}</p>}
          </div>
        )}
      </div>

      {insightsQuery.isLoading && <p className="text-sm text-neutral-400">Carregando métricas...</p>}
      {insightsQuery.isError && (
        <p className="text-sm text-status-error">
          {insightsQuery.error instanceof Error ? insightsQuery.error.message : "Erro ao carregar métricas."}
        </p>
      )}

      {!insightsQuery.isLoading && !insightsQuery.isError && snapshots.length === 0 && (
        <p className="text-sm text-neutral-500">
          Nenhuma métrica sincronizada ainda para esta conta. Clique em &quot;Sincronizar agora&quot; para buscar os
          dados mais recentes.
        </p>
      )}

      {latestByMetric.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {latestByMetric.map((snapshot) => (
            <Card key={snapshot.metric} className="flex flex-col gap-1 p-4">
              <span className="text-xs text-neutral-500">{formatMetricLabel(snapshot.metric)}</span>
              <span className="text-2xl font-semibold text-neutral-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatValue(snapshot.value)}
              </span>
              <span className="text-[11px] text-neutral-400">Em {formatDate(snapshot.snapshot_date)}</span>
            </Card>
          ))}
        </div>
      )}

      {byMetric.size > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...byMetric.entries()].map(([metric, points]) => (
            <MetricLineChart key={metric} metric={metric} points={points} />
          ))}
        </div>
      )}
    </div>
  );
}
