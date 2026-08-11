"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";

interface ConvertResponse {
  client: { id: string; name: string };
  already_converted: boolean;
}

async function convertProspect(prospectId: string): Promise<ConvertResponse> {
  const res = await fetch(`/api/prospects/${prospectId}/convert`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao converter prospect");
  }
  return res.json();
}

export function ConvertToClientButton({ prospectId, prospectName }: { prospectId: string; prospectName: string }) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Não há página /clients/[id] no portal ainda (ver design/sales-pipeline-spec.md,
  // seção 7.1) — para o MVP o card simplesmente sai do board ao invalidar a query,
  // sem redirect. Reavaliar quando essa rota existir.
  const convertMutation = useMutation({
    mutationFn: () => convertProspect(prospectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Não foi possível converter este prospect. Tente novamente.");
    },
  });

  function handleClick() {
    setError(null);
    if (window.confirm(`Converter ${prospectName} em cliente? Essa ação não pode ser desfeita.`)) {
      convertMutation.mutate();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="primary" className="w-full text-xs" onClick={handleClick} disabled={convertMutation.isPending}>
        {convertMutation.isPending ? "Convertendo..." : "Converter em cliente"}
      </Button>
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  );
}
