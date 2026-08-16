"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";

interface ClickPoint {
  date: string;
  count: number;
}

async function fetchClicks(clientId?: string): Promise<ClickPoint[]> {
  const url = clientId ? `/api/utm-links/clicks?client_id=${clientId}` : "/api/utm-links/clicks";
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao carregar cliques");
  }
  return res.json();
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(dateStr: string): string {
  // dateStr é "YYYY-MM-DD" — cria a data em UTC para evitar deslocamento de fuso.
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Preenche os dias sem clique (a API só retorna dias com pelo menos 1 clique)
// para desenhar um eixo contínuo de 30 dias.
function fillGaps(points: ClickPoint[]): ClickPoint[] {
  const byDate = new Map(points.map((p) => [p.date, p.count]));
  const result: ClickPoint[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return result;
}

// Gráfico de barras simples em SVG — sem lib de chart, conforme padrão atual do projeto.
function ClicksBarChart({ points }: { points: ClickPoint[] }) {
  const width = 640;
  const height = 120;
  const paddingX = 8;
  const paddingY = 12;
  const barGap = 2;

  const max = Math.max(...points.map((p) => p.count), 1);
  const barWidth = (width - paddingX * 2) / points.length - barGap;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" role="img" aria-label="Cliques por dia nos últimos 30 dias">
      {points.map((p, i) => {
        const barHeight = (p.count / max) * (height - paddingY * 2);
        const x = paddingX + i * (barWidth + barGap);
        const y = height - paddingY - barHeight;
        return (
          <rect key={p.date} x={x} y={y} width={Math.max(barWidth, 0)} height={barHeight} fill="#2563eb" rx={1}>
            <title>
              {p.count} cliques em {formatDate(p.date)}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

export function UtmClicksPanel({ clientId }: { clientId?: string } = {}) {
  const clicksQuery = useQuery({ queryKey: ["utm-clicks", clientId ?? null], queryFn: () => fetchClicks(clientId) });

  const points = useMemo(() => fillGaps(clicksQuery.data ?? []), [clicksQuery.data]);
  const total = useMemo(() => points.reduce((sum, p) => sum + p.count, 0), [points]);
  const hasAnyClick = total > 0;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Cliques em links (UTM)</h2>

      {clicksQuery.isLoading && <p className="text-sm text-neutral-400">Carregando cliques...</p>}
      {clicksQuery.isError && (
        <p className="text-sm text-status-error">
          {clicksQuery.error instanceof Error ? clicksQuery.error.message : "Erro ao carregar cliques."}
        </p>
      )}

      {!clicksQuery.isLoading && !clicksQuery.isError && !hasAnyClick && (
        <p className="text-sm text-neutral-500">
          Nenhum clique registrado ainda nos links UTM deste cliente. Assim que alguém clicar em um link rastreado,
          os dados aparecem aqui.
        </p>
      )}

      {!clicksQuery.isLoading && !clicksQuery.isError && hasAnyClick && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <Card className="flex flex-col gap-2 p-4">
            <h3 className="text-sm font-medium text-neutral-700">Cliques por dia</h3>
            <ClicksBarChart points={points} />
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>{formatDate(points[0].date)}</span>
              <span>{formatDate(points[points.length - 1].date)}</span>
            </div>
          </Card>
          <Card className="flex flex-col gap-1 p-4">
            <span className="text-xs text-neutral-500">Total de cliques (30 dias)</span>
            <span className="text-2xl font-semibold text-neutral-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatValue(total)}
            </span>
          </Card>
        </div>
      )}

      {/* TODO: cliques por link — endpoint ainda não existe (GET /api/utm-links/clicks só agrega por dia, não por link) */}
    </div>
  );
}
