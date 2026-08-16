"use client";

import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { AgentTaskCard } from "@/components/agent/AgentTaskCard";
import type { AgentRun, AgentTask, AgentTaskStatus } from "@/lib/types/agent";
import type { Client } from "@/lib/types/client";

async function fetchAgentTasks(): Promise<AgentTask[]> {
  const res = await fetch("/api/agent-tasks");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível carregar as tasks do agente.");
  }
  return res.json();
}

async function fetchAgentRuns(taskId: string): Promise<AgentRun[]> {
  const res = await fetch(`/api/agent-tasks/${taskId}/runs`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) return [];
  return res.json();
}

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "sugerir_legenda", label: "Sugestão de legenda" },
  { value: "checar_anomalia_insight", label: "Checagem de anomalia" },
  { value: "pesquisar_prospect", label: "Pesquisa de prospect" },
];

const STATUS_FILTERS: { value: AgentTaskStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "running", label: "Em execução" },
  { value: "completed", label: "Concluída" },
  { value: "failed", label: "Falhou" },
];

// Painel consolidado de agent_tasks/agent_runs de todos os clientes
// (design/INFORMATION_ARCHITECTURE.md seção 5.1) -- hoje só existia por
// content_item individual (AgentReasoningPanel). Reaproveita AgentTaskCard,
// já usado lá, com showClientName pra dar o contexto cross-cliente.
export function AgentActivityPanel() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<AgentTaskStatus | "all">("all");

  const tasksQuery = useQuery({ queryKey: ["agent-tasks"], queryFn: fetchAgentTasks });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clientsQuery.data ?? []) map.set(client.id, client.name);
    return map;
  }, [clientsQuery.data]);

  const allTasks = tasksQuery.data ?? [];
  const filteredTasks = allTasks
    .filter((t) => typeFilter === "all" || t.type === typeFilter)
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const runsQueries = useQueries({
    queries: filteredTasks.map((task) => ({
      queryKey: ["agent-runs", task.id],
      queryFn: () => fetchAgentRuns(task.id),
      enabled: !!task.id,
    })),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Atividade dos agentes</h1>
        <p className="mt-1 text-sm text-neutral-500">Todas as tasks de IA, de todos os clientes.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AgentTaskStatus | "all")}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {tasksQuery.isLoading && <p className="text-sm text-neutral-400">Carregando tasks do agente...</p>}
      {tasksQuery.isError && (
        <p className="text-sm text-status-error">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Não foi possível carregar as tasks."}
        </p>
      )}

      {!tasksQuery.isLoading && !tasksQuery.isError && filteredTasks.length === 0 && (
        <Card className="p-6 text-sm text-neutral-500">Nenhuma task encontrada com esse filtro.</Card>
      )}

      {filteredTasks.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredTasks.map((task, index) => (
            <Card key={task.id} className="p-4">
              <AgentTaskCard
                task={task}
                runs={runsQueries[index]?.data ?? []}
                showClientName
                clientName={task.client_id ? (clientNameById.get(task.client_id) ?? task.client_id) : "—"}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
