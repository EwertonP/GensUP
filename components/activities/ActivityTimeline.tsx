"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { ActivityTypeBadge } from "@/components/activities/ActivityTypeBadge";
import type { Activity } from "@/lib/types/crm";

interface ActivityTimelineProps {
  prospectId?: string;
  clientId?: string;
  /** Nome exibido para cada `created_by` — a API não faz join hoje (ver
   * design/prospect-activity-timeline-spec.md, ponto 7.2), então resolvemos
   * a partir de um mapa carregado pela página. */
  createdByNameById?: Map<string, string>;
}

async function fetchActivities(prospectId?: string, clientId?: string): Promise<Activity[]> {
  const params = new URLSearchParams();
  if (prospectId) params.set("prospect_id", prospectId);
  if (clientId) params.set("client_id", clientId);
  const res = await fetch(`/api/activities?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível carregar as atividades.");
  }
  return res.json();
}

// Timeline genérica de atividades de CRM — aceita prospectId OU clientId, para
// ser reaproveitada tanto na página de detalhe de prospect quanto (futuramente)
// na página de cliente ativo pós-conversão.
export function ActivityTimeline({ prospectId, clientId, createdByNameById }: ActivityTimelineProps) {
  const queryKey = ["activities", prospectId ?? null, clientId ?? null];

  const activitiesQuery = useQuery({
    queryKey,
    queryFn: () => fetchActivities(prospectId, clientId),
  });

  const activities = activitiesQuery.data ?? [];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Atividades</h3>

      <ActivityForm prospectId={prospectId} clientId={clientId} queryKey={queryKey} />

      {activitiesQuery.isLoading && <p className="text-sm text-neutral-400">Carregando atividades...</p>}
      {activitiesQuery.isError && (
        <p className="text-sm text-status-error">
          {activitiesQuery.error instanceof Error ? activitiesQuery.error.message : "Não foi possível carregar as atividades."}
        </p>
      )}

      {!activitiesQuery.isLoading && !activitiesQuery.isError && activities.length === 0 && (
        <p className="text-sm text-neutral-400">Nenhuma atividade registrada ainda. Use o formulário acima para começar.</p>
      )}

      {activities.length > 0 && (
        <ol className="flex flex-col gap-3 border-l border-neutral-200 pl-4">
          {activities.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary-500" />
              <div className="flex flex-wrap items-center gap-2">
                <ActivityTypeBadge type={a.type} />
                <span className="text-xs text-neutral-400">
                  {(a.created_by && createdByNameById?.get(a.created_by)) ?? "Sistema"} ·{" "}
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{a.body}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
