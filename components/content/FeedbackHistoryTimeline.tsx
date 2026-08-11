"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import type { FeedbackHistoryEntry } from "@/lib/types/content";

interface FeedbackHistoryTimelineProps {
  contentItemId: string;
}

async function fetchHistory(contentItemId: string): Promise<FeedbackHistoryEntry[]> {
  const res = await fetch(`/api/content-items/${encodeURIComponent(contentItemId)}/history`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao carregar histórico");
  }
  return res.json();
}

// Timeline de auditoria de mudanças de status de um content_item — populada
// pelo trigger on_content_item_status_change (ver supabase/migrations/010_audit.sql).
// Somente leitura: nenhuma ação de escrita aqui.
export function FeedbackHistoryTimeline({ contentItemId }: FeedbackHistoryTimelineProps) {
  const historyQuery = useQuery({
    queryKey: ["feedback-history", contentItemId],
    queryFn: () => fetchHistory(contentItemId),
  });

  const entries = historyQuery.data ?? [];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Histórico de status</h3>

      {historyQuery.isLoading && <p className="text-sm text-neutral-400">Carregando histórico...</p>}
      {historyQuery.isError && (
        <p className="text-sm text-status-error">{(historyQuery.error as Error).message}</p>
      )}

      {!historyQuery.isLoading && !historyQuery.isError && entries.length === 0 && (
        <p className="text-sm text-neutral-400">Nenhuma mudança de status registrada ainda.</p>
      )}

      {entries.length > 0 && (
        <ol className="flex flex-col gap-3 border-l border-neutral-200 pl-4">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary-500" />
              <div className="flex flex-wrap items-center gap-2">
                {entry.old_status && <StatusBadge status={entry.old_status} />}
                {entry.old_status && <span className="text-xs text-neutral-400">→</span>}
                <StatusBadge status={entry.new_status} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {entry.changed_by_user?.email ?? "Sistema"} · {new Date(entry.changed_at).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
