// Tipos locais para agent_tasks / agent_runs, espelhando supabase/migrations/001_schema.sql.

export type AgentTaskStatus = "pending" | "running" | "completed" | "failed";

// Tipos suportados pelo worker (app/api/agent-worker/route.ts). Qualquer outro
// valor de `type` e aceito na criacao da task, mas marcado failed pelo worker.
export type AgentTaskType = "sugerir_legenda" | "checar_anomalia_insight" | string;

export interface AgentTask {
  id: string;
  client_id: string | null;
  type: AgentTaskType;
  status: AgentTaskStatus;
  payload: Record<string, unknown>;
  created_at: string;
}

// outcome e sempre 'sugerido_para_revisao' nesta versao do MVP -- "nada e
// chutado": mesmo confianca alta nunca aplica automaticamente.
export type AgentRunOutcome = "aplicado" | "sugerido_para_revisao";

export interface AgentRun {
  id: string;
  agent_task_id: string;
  confidence: number | null;
  reasoning: string | null;
  outcome: AgentRunOutcome | string | null;
  created_at: string;
}
