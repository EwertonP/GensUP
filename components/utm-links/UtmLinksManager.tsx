"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClientSelect } from "@/components/agency/ClientSelect";
import { UtmLinkList } from "@/components/utm-links/UtmLinkList";
import { UtmLinkForm } from "@/components/utm-links/UtmLinkForm";
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

async function fetchClients(): Promise<ClientOption[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) return [];
  return res.json();
}

export function UtmLinksManager() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [formState, setFormState] = useState<{ open: boolean; link: UtmLink | null }>({
    open: false,
    link: null,
  });

  const linksQuery = useQuery({ queryKey: ["utm-links"], queryFn: fetchLinks });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clientsQuery.data ?? []) {
      map.set(client.id, client.name);
    }
    return map;
  }, [clientsQuery.data]);

  const links = linksQuery.data ?? [];
  const filteredLinks = selectedClientId ? links.filter((l) => l.client_id === selectedClientId) : links;
  const showClientColumn = !selectedClientId;

  function openCreateForm() {
    setFormState({ open: true, link: null });
  }

  function openEditForm(link: UtmLink) {
    setFormState({ open: true, link });
  }

  function closeForm() {
    setFormState({ open: false, link: null });
  }

  const selectedClientName = selectedClientId ? clientNameById.get(selectedClientId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500" htmlFor="client-filter">
            Cliente
          </label>
          <ClientSelect
            id="client-filter"
            value={selectedClientId}
            onChange={setSelectedClientId}
            allOptionLabel="Todos os clientes"
            className="min-w-[220px]"
          />
        </div>
        <Button variant="primary" onClick={openCreateForm}>
          + Novo link
        </Button>
      </div>

      {linksQuery.isLoading && <p className="text-sm text-neutral-400">Carregando links...</p>}
      {linksQuery.isError && (
        <p className="text-sm text-status-error">
          {linksQuery.error instanceof Error ? linksQuery.error.message : "Erro ao carregar links."}
        </p>
      )}

      {!linksQuery.isLoading && !linksQuery.isError && filteredLinks.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-neutral-500">
            Nenhum link UTM criado ainda{selectedClientName ? ` para ${selectedClientName}` : ""}. Crie o primeiro
            link para começar a rastrear cliques em campanhas.
          </p>
          <Button variant="primary" onClick={openCreateForm}>
            + Novo link
          </Button>
        </Card>
      )}

      {filteredLinks.length > 0 && (
        <UtmLinkList
          links={filteredLinks}
          showClientColumn={showClientColumn}
          clientNameById={clientNameById}
          onEdit={openEditForm}
        />
      )}

      {formState.open && (
        <UtmLinkForm
          link={formState.link}
          clientNameById={clientNameById}
          defaultClientId={selectedClientId || undefined}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
