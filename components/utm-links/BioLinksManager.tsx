"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClientSelect } from "@/components/agency/ClientSelect";
import { LinkStatusBadge } from "@/components/utm-links/LinkStatusBadge";
import type { UtmLink } from "@/lib/types/utm";
import type { ClientOption } from "@/components/agency/ClientSelect";

async function fetchLinks(): Promise<UtmLink[]> {
  const res = await fetch("/api/utm-links");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao carregar links");
  }
  return res.json();
}

async function updateDisplayOrder(id: string, displayOrder: number): Promise<void> {
  const res = await fetch(`/api/utm-links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_order: displayOrder }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao reordenar link");
  }
}

async function fetchClients(): Promise<ClientOption[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) return [];
  return res.json();
}

// Gestão do Link na Bio por cliente (design/INFORMATION_ARCHITECTURE.md
// seção 4.2): reordenar (persistido em utm_links.display_order, migration 020)
// e preview ao vivo da página pública /b/[slug]. Upload de foto de capa/avatar
// fica pra depois -- clients não tem campo pra isso ainda.
export function BioLinksManager() {
  const [clientId, setClientId] = useState("");
  const queryClient = useQueryClient();

  const linksQuery = useQuery({ queryKey: ["utm-links"], queryFn: fetchLinks });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const clientSlug = useMemo(
    () => clientsQuery.data?.find((c) => c.id === clientId) as (ClientOption & { slug?: string }) | undefined,
    [clientsQuery.data, clientId]
  );

  const links = useMemo(
    () =>
      (linksQuery.data ?? [])
        .filter((l) => l.client_id === clientId)
        .sort((a, b) => a.display_order - b.display_order),
    [linksQuery.data, clientId]
  );

  const reorderMutation = useMutation({
    mutationFn: ({ id, displayOrder }: { id: string; displayOrder: number }) => updateDisplayOrder(id, displayOrder),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["utm-links"] }),
  });

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const a = links[index];
    const b = links[target];
    reorderMutation.mutate({ id: a.id, displayOrder: b.display_order });
    reorderMutation.mutate({ id: b.id, displayOrder: a.display_order });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Link na Bio</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Reordene os links que aparecem na página pública de cada cliente.
        </p>
      </div>

      <ClientSelect value={clientId} onChange={setClientId} className="max-w-xs" />

      {!clientId && <Card className="p-6 text-sm text-neutral-500">Selecione um cliente pra gerenciar o link na bio.</Card>}

      {clientId && linksQuery.isLoading && <p className="text-sm text-neutral-400">Carregando links...</p>}
      {clientId && linksQuery.isError && (
        <p className="text-sm text-status-error">
          {linksQuery.error instanceof Error ? linksQuery.error.message : "Erro ao carregar links."}
        </p>
      )}

      {clientId && !linksQuery.isLoading && !linksQuery.isError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          {links.length === 0 && (
            <Card className="p-6 text-sm text-neutral-500">
              Nenhum link cadastrado pra este cliente ainda. Crie links em{" "}
              <a href="/links" className="text-primary-700 hover:underline">
                Gerador de UTM
              </a>
              .
            </Card>
          )}

          {links.length > 0 && (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-neutral-100">
                {links.map((link, index) => (
                  <li key={link.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0 || reorderMutation.isPending}
                          className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === links.length - 1 || reorderMutation.isPending}
                          className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{link.title}</p>
                        <p className="text-xs text-neutral-400">/l/{link.slug}</p>
                      </div>
                    </div>
                    <LinkStatusBadge isActive={link.is_active} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold text-neutral-700">Preview</h2>
            {clientSlug?.slug ? (
              <a
                href={`/b/${clientSlug.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary-700 hover:underline"
              >
                Abrir página pública /b/{clientSlug.slug}
              </a>
            ) : (
              <p className="text-xs text-neutral-400">Este cliente ainda não tem slug configurado.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
