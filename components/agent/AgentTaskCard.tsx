"use client";

import { useState } from "react";
import type { AgentRun, AgentTask } from "@/lib/types/agent";

const TASK_TYPE_LABELS: Record<string, string> = {
  sugerir_legenda: "Sugestão de legenda",
  checar_anomalia_insight: "Checagem de anomalia",
};

function TaskTypeLabel({ type }: { type: string }) {
  return <span className="text-sm font-medium text-neutral-900">{TASK_TYPE_LABELS[type] ?? type}</span>;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  running: "Em execução",
  completed: "Concluída",
  failed: "Falhou",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

function TaskStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        TASK_STATUS_COLORS[status] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {TASK_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const pct = Math.round(confidence * 100);
  const label = confidence >= 0.75 ? "Alta confiança" : confidence >= 0.4 ? "Média confiança" : "Baixa confiança";
  const color = confidence >= 0.75 ? "bg-emerald-500" : confidence >= 0.4 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500">
        {label} ({pct}%)
      </span>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return null;
  const isApplied = outcome === "aplicado";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isApplied ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {isApplied ? "Aplicado automaticamente" : "Sugerido para revisão"}
    </span>
  );
}

function UseSuggestionButton({ run, taskType }: { run: AgentRun; taskType: string }) {
  const [copied, setCopied] = useState(false);
  const label = taskType === "sugerir_legenda" ? "Usar esta legenda" : "Usar esta sugestão";

  async function handleClick() {
    if (!run.reasoning) return;
    try {
      await navigator.clipboard.writeText(run.reasoning);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard indisponível (ex. contexto não seguro) — sem feedback de erro
      // bloqueante, a ação é apenas de conveniência.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-2 rounded-md bg-secondary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-secondary-600"
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}

interface AgentTaskCardProps {
  task: AgentTask;
  runs: AgentRun[];
  showClientName?: boolean;
  clientName?: string;
}

export function AgentTaskCard({ task, runs, showClientName, clientName }: AgentTaskCardProps) {
  return (
    <div className="flex flex-col gap-2">
      {showClientName && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600">{clientName ?? "—"}</span>
          <span className="text-xs text-neutral-400">{new Date(task.created_at).toLocaleString("pt-BR")}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <TaskTypeLabel type={task.type} />
        <TaskStatusBadge status={task.status} />
        {!showClientName && (
          <span className="text-xs text-neutral-400">{new Date(task.created_at).toLocaleString("pt-BR")}</span>
        )}
      </div>

      {runs
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((run) => (
          <div key={run.id} className="rounded-md border border-neutral-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <ConfidenceIndicator confidence={run.confidence} />
              <OutcomeBadge outcome={run.outcome} />
            </div>
            {run.reasoning && <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{run.reasoning}</p>}
            {run.outcome === "sugerido_para_revisao" && <UseSuggestionButton run={run} taskType={task.type} />}
          </div>
        ))}
    </div>
  );
}
