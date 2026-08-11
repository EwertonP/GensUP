"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import type { Activity, ActivityType } from "@/lib/types/crm";

interface ActivityFormProps {
  prospectId?: string;
  clientId?: string;
  queryKey: unknown[];
}

async function createActivity(body: Record<string, unknown>): Promise<Activity> {
  const res = await fetch("/api/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}));
    throw new Error(responseBody.error ?? "Não foi possível registrar a atividade. Tente novamente.");
  }
  return res.json();
}

export function ActivityForm({ prospectId, clientId, queryKey }: ActivityFormProps) {
  const [type, setType] = useState<ActivityType>("nota");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createActivity({
        prospect_id: prospectId ?? null,
        client_id: clientId ?? null,
        type,
        body,
      }),
    onSuccess: () => {
      setBody("");
      setError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a atividade. Tente novamente.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ActivityType)}
          className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
        >
          <option value="nota">Nota</option>
          <option value="email">Email</option>
          <option value="ligacao">Ligação</option>
          <option value="reuniao">Reunião</option>
        </select>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Descreva o que aconteceu..."
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      {error && <p className="text-xs text-status-error">{error}</p>}
      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={!body.trim() || createMutation.isPending}>
          {createMutation.isPending ? "Registrando..." : "Registrar atividade"}
        </Button>
      </div>
    </form>
  );
}
