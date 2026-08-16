"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { ClientStatusBadge } from "@/components/clients/ClientStatusBadge";
import { ClientForm } from "@/components/clients/ClientForm";
import type { Client, ClientStatus } from "@/lib/types/client";

async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível carregar os clientes.");
  }
  return res.json();
}

async function fetchSocialAccountCounts(): Promise<Map<string, number>> {
  const res = await fetch("/api/social-accounts");
  if (!res.ok) return new Map();
  const accounts: { client_id: string }[] = await res.json();
  const counts = new Map<string, number>();
  for (const account of accounts) {
    counts.set(account.client_id, (counts.get(account.client_id) ?? 0) + 1);
  }
  return counts;
}

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Ativos",
  paused: "Pausados",
  archived: "Arquivados",
};

export function ClientsBoard({ canCreate }: { canCreate: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");

  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const socialCountsQuery = useQuery({ queryKey: ["social-accounts-counts"], queryFn: fetchSocialAccountCounts });

  const clients = clientsQuery.data ?? [];
  const socialCounts = socialCountsQuery.data ?? new Map<string, number>();

  const filteredClients = useMemo(
    () => (statusFilter === "all" ? clients : clients.filter((c) => c.status === statusFilter)),
    [clients, statusFilter]
  );

  const tabs: TabItem[] = useMemo(() => {
    const counts = new Map<ClientStatus, number>();
    for (const client of clients) counts.set(client.status, (counts.get(client.status) ?? 0) + 1);
    return [
      { value: "all", label: "Todos", count: clients.length },
      ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
        count: counts.get(value as ClientStatus) ?? 0,
      })),
    ];
  }, [clients]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Clientes</h1>
          <p className="text-sm text-neutral-500">Todos os clientes ativos, pausados e arquivados da agência.</p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Novo cliente
          </Button>
        )}
      </div>

      <Tabs tabs={tabs} value={statusFilter} onChange={(v) => setStatusFilter(v as ClientStatus | "all")} />

      {clientsQuery.isLoading && <p className="text-sm text-neutral-400">Carregando clientes...</p>}
      {clientsQuery.isError && (
        <p className="text-sm text-status-error">
          {clientsQuery.error instanceof Error ? clientsQuery.error.message : "Não foi possível carregar os clientes."}
        </p>
      )}

      {!clientsQuery.isLoading && !clientsQuery.isError && filteredClients.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-neutral-500">Nenhum cliente encontrado com esse filtro.</p>
        </Card>
      )}

      {filteredClients.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Contas sociais</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-primary-700 hover:underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{socialCounts.get(client.id) ?? 0}</td>
                  <td className="px-4 py-3 text-neutral-400">{new Date(client.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && <ClientForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
