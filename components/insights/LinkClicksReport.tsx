"use client";

import { useState } from "react";
import { ClientSelect } from "@/components/agency/ClientSelect";
import { UtmClicksPanel } from "@/components/insights/UtmClicksPanel";

// Tela própria pra Relatório de cliques (design/INFORMATION_ARCHITECTURE.md
// seção 4.3), reaproveitando o mesmo UtmClicksPanel já usado em /insights --
// decisão: evitar duplicar a lógica de agregação, só adicionar o seletor de
// cliente (que a versão de /insights não precisa, já é por client_id fixo).
export function LinkClicksReport() {
  const [clientId, setClientId] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Relatório de cliques</h1>
        <p className="mt-1 text-sm text-neutral-500">Cliques nos links UTM dos últimos 30 dias.</p>
      </div>

      <ClientSelect value={clientId} onChange={setClientId} allOptionLabel="Todos os clientes" className="max-w-xs" />

      <UtmClicksPanel clientId={clientId || undefined} />
    </div>
  );
}
