"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ClientOption {
  id: string;
  name: string;
}

interface MonthlyReportDownloadProps {
  // Quando o usuário é "cliente", já sabemos o client_id (role restringe a rota
  // a esse client de qualquer forma) e escondemos o seletor de cliente.
  clientId: string | null;
  canPickClient: boolean;
}

async function fetchClients(): Promise<ClientOption[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) return [];
  return res.json();
}

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyReportDownload({ clientId, canPickClient }: MonthlyReportDownloadProps) {
  const [month, setMonth] = useState(defaultMonth());
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "empty">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients-for-report"],
    queryFn: fetchClients,
    enabled: canPickClient,
  });

  // Deriva o cliente efetivo sem efeito: usa a seleção manual do usuário se houver,
  // senão cai no primeiro cliente da lista carregada (evita setState em useEffect).
  const effectiveSelectedClientId =
    selectedClientId || (canPickClient ? (clientsQuery.data?.[0]?.id ?? "") : (clientId ?? ""));

  async function handleDownload() {
    const effectiveClientId = canPickClient ? effectiveSelectedClientId : clientId;
    if (!effectiveClientId) {
      setStatus("error");
      setErrorMessage("Selecione um cliente.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/reports/monthly?client_id=${encodeURIComponent(effectiveClientId)}&month=${encodeURIComponent(month)}`
      );

      if (res.status === 404) {
        const body = await res.json().catch(() => ({}));
        setStatus("empty");
        setErrorMessage(body.error ?? "Sem dados suficientes para gerar o relatório nesse mês.");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao gerar relatório");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-${effectiveClientId}-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Relatório mensal</h3>
      <p className="text-sm text-neutral-500">Baixe um PDF com as métricas agregadas do mês selecionado.</p>

      <div className="flex flex-wrap items-end gap-3">
        {canPickClient && (
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Cliente
            <select
              value={effectiveSelectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {(clientsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-neutral-500">
          Mês
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </label>

        <Button onClick={handleDownload} disabled={status === "loading"}>
          {status === "loading" ? "Gerando..." : "Baixar relatório"}
        </Button>
      </div>

      {status === "empty" && <p className="text-sm text-status-changes_requested">{errorMessage}</p>}
      {status === "error" && <p className="text-sm text-status-error">{errorMessage}</p>}
    </Card>
  );
}
