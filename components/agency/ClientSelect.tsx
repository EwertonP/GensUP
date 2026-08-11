"use client";

import { useQuery } from "@tanstack/react-query";

export interface ClientOption {
  id: string;
  name: string;
  status: string;
}

async function fetchClients(): Promise<ClientOption[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao carregar clientes");
  }
  return res.json();
}

interface ClientSelectProps {
  value: string;
  onChange: (clientId: string) => void;
  /** Opção extra no topo, ex.: "Todos os clientes". Se omitido, primeira opção é o placeholder. */
  allOptionLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

// Seletor de cliente reutilizável no portal da agência — busca GET /api/clients
// (role agencia/admin). Não existe um componente compartilhado para isso ainda,
// então este é o primeiro; outras telas podem reaproveitá-lo.
export function ClientSelect({
  value,
  onChange,
  allOptionLabel,
  placeholder = "Selecione o cliente...",
  className = "",
  disabled = false,
  id,
}: ClientSelectProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const clients = data ?? [];

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || isLoading}
      className={`w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${className}`}
    >
      {allOptionLabel ? (
        <option value="">{allOptionLabel}</option>
      ) : (
        <option value="" disabled>
          {isLoading ? "Carregando clientes..." : placeholder}
        </option>
      )}
      {isError && <option disabled>Erro ao carregar clientes</option>}
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}
