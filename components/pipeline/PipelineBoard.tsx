"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PipelineColumn } from "@/components/pipeline/PipelineColumn";
import { ProspectForm, type UserOption } from "@/components/pipeline/ProspectForm";
import type { Prospect, ProspectStage } from "@/lib/types/crm";

const COLUMNS: { stage: ProspectStage; label: string; muted?: boolean }[] = [
  { stage: "novo", label: "Novo" },
  { stage: "contatado", label: "Contatado" },
  { stage: "proposta", label: "Proposta" },
  { stage: "fechado", label: "Fechado" },
  { stage: "perdido", label: "Perdido", muted: true },
];

async function fetchProspects(): Promise<Prospect[]> {
  const res = await fetch("/api/prospects");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível carregar o pipeline. Tente novamente em instantes.");
  }
  return res.json();
}

interface PipelineBoardProps {
  users: UserOption[];
  ownerNameById: Map<string, string>;
  currentUserId?: string;
}

export function PipelineBoard({ users, ownerNameById, currentUserId }: PipelineBoardProps) {
  const [showForm, setShowForm] = useState(false);
  const prospectsQuery = useQuery({ queryKey: ["prospects"], queryFn: fetchProspects });

  const prospects = prospectsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Pipeline de vendas</h1>
          <p className="text-sm text-neutral-500">Acompanhe prospects do primeiro contato até o fechamento.</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          + Novo prospect
        </Button>
      </div>

      {prospectsQuery.isLoading && <p className="text-sm text-neutral-400">Carregando pipeline...</p>}
      {prospectsQuery.isError && (
        <p className="text-sm text-status-error">
          {prospectsQuery.error instanceof Error
            ? prospectsQuery.error.message
            : "Não foi possível carregar o pipeline. Tente novamente em instantes."}
        </p>
      )}

      {!prospectsQuery.isLoading && !prospectsQuery.isError && prospects.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-neutral-500">
            Nenhum prospect cadastrado ainda. Crie o primeiro prospect para começar a acompanhar o funil de vendas.
          </p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Novo prospect
          </Button>
        </Card>
      )}

      {prospects.length > 0 && (
        <div className="grid grid-cols-5 gap-4 overflow-x-auto">
          {COLUMNS.map((col) => (
            <PipelineColumn
              key={col.stage}
              label={col.label}
              muted={col.muted}
              prospects={prospects.filter((p) => p.stage === col.stage)}
              ownerNameById={ownerNameById}
            />
          ))}
        </div>
      )}

      {showForm && <ProspectForm users={users} defaultOwnerId={currentUserId} onClose={() => setShowForm(false)} />}
    </div>
  );
}
