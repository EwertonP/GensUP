"use client";

import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AgentTaskCard } from "@/components/agent/AgentTaskCard";
import type { AgentRun, AgentTask } from "@/lib/types/agent";

async function fetchAgentTasks(): Promise<AgentTask[]> {
  const res = await fetch("/api/agent-tasks");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível carregar as sugestões do agente.");
  }
  return res.json();
}

async function fetchAgentRuns(taskId: string): Promise<AgentRun[]> {
  const res = await fetch(`/api/agent-tasks/${taskId}/runs`);
  if (!res.ok) return [];
  return res.json();
}

async function generateCaptionSuggestion(contentItemId: string): Promise<AgentTask> {
  const res = await fetch("/api/agent-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "sugerir_legenda", payload: { content_item_id: contentItemId } }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível gerar a sugestão. Tente novamente.");
  }
  return res.json();
}

export function AgentReasoningPanel({ contentItemId }: { contentItemId: string }) {
  const [generateError, setGenerateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["agent-tasks"],
    queryFn: fetchAgentTasks,
    // Polling simples enquanto houver tasks em andamento — sem infra de
    // realtime nova (ver design/agent-reasoning-tab-spec.md, seção 4.2).
    refetchInterval: (query) => {
      const data = query.state.data as AgentTask[] | undefined;
      const hasPending = (data ?? []).some((t) => t.status === "pending" || t.status === "running");
      return hasPending ? 3000 : false;
    },
  });

  const allTasks = tasksQuery.data ?? [];
  // A API não filtra por content_item_id — filtramos no client pelo payload,
  // conforme combinado com o Backend.
  const tasks = allTasks.filter((t) => t.payload?.content_item_id === contentItemId);

  const runsQueries = useQueries({
    queries: tasks.map((task) => ({
      queryKey: ["agent-runs", task.id],
      queryFn: () => fetchAgentRuns(task.id),
      enabled: !!task.id,
    })),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateCaptionSuggestion(contentItemId),
    onSuccess: () => {
      setGenerateError(null);
      queryClient.invalidateQueries({ queryKey: ["agent-tasks"] });
    },
    onError: (err) => {
      setGenerateError(err instanceof Error ? err.message : "Não foi possível gerar a sugestão. Tente novamente.");
    },
  });

  const sortedTasks = tasks
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Raciocínio do agente</h3>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "Gerando..." : "Gerar sugestão de legenda"}
          </Button>
          {generateError && <p className="text-xs text-status-error">{generateError}</p>}
        </div>
      </div>

      {tasksQuery.isLoading && <p className="text-sm text-neutral-400">Carregando sugestões do agente...</p>}
      {tasksQuery.isError && (
        <p className="text-sm text-status-error">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Não foi possível carregar as sugestões do agente."}
        </p>
      )}

      {!tasksQuery.isLoading && !tasksQuery.isError && sortedTasks.length === 0 && (
        <p className="text-sm text-neutral-400">
          Nenhuma sugestão do agente para este item ainda. Use o botão acima para gerar uma legenda.
        </p>
      )}

      {sortedTasks.length > 0 && (
        <ol className="flex flex-col gap-4 border-l border-neutral-200 pl-4">
          {sortedTasks.map((task) => {
            const index = tasks.findIndex((t) => t.id === task.id);
            const runs = runsQueries[index]?.data ?? [];
            return (
              <li key={task.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary-500" />
                <AgentTaskCard task={task} runs={runs} />
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
