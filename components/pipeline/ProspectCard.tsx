"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "@/components/pipeline/SourceBadge";
import { StaleIndicator } from "@/components/pipeline/StaleIndicator";
import { ConvertToClientButton } from "@/components/pipeline/ConvertToClientButton";
import type { Prospect, ProspectStage } from "@/lib/types/crm";

const STAGE_OPTIONS: { value: ProspectStage; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "proposta", label: "Proposta" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

async function updateProspectStage(id: string, stage: ProspectStage): Promise<Prospect> {
  const res = await fetch(`/api/prospects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao mover prospect");
  }
  return res.json();
}

export function ProspectCard({ prospect, ownerName }: { prospect: Prospect; ownerName: string | null }) {
  const queryClient = useQueryClient();

  const stageMutation = useMutation({
    mutationFn: (stage: ProspectStage) => updateProspectStage(prospect.id, stage),
    onMutate: async (stage) => {
      await queryClient.cancelQueries({ queryKey: ["prospects"] });
      const previous = queryClient.getQueryData<Prospect[]>(["prospects"]);
      queryClient.setQueryData<Prospect[]>(["prospects"], (old) =>
        (old ?? []).map((p) => (p.id === prospect.id ? { ...p, stage } : p))
      );
      return { previous };
    },
    onError: (_err, _stage, context) => {
      if (context?.previous) queryClient.setQueryData(["prospects"], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });

  return (
    <Card className="flex flex-col gap-2 p-3 text-sm">
      <Link href={`/pipeline/${prospect.id}`} className="hover:underline">
        <p className="truncate font-medium text-neutral-900">{prospect.name}</p>
      </Link>
      <p className="truncate text-xs text-neutral-500">{prospect.company}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={prospect.source} />
        <StaleIndicator updatedAt={prospect.created_at} />
      </div>

      <p className="text-xs text-neutral-400">Dono: {ownerName ?? "—"}</p>

      <select
        value={prospect.stage}
        onChange={(e) => stageMutation.mutate(e.target.value as ProspectStage)}
        disabled={stageMutation.isPending}
        className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {STAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {prospect.stage === "fechado" && (
        <ConvertToClientButton prospectId={prospect.id} prospectName={prospect.name} />
      )}
    </Card>
  );
}
