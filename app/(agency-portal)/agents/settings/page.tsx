import { Card } from "@/components/ui/Card";

// Decidido em 2026-08-13 (design/INFORMATION_ARCHITECTURE.md seção 5.3): não
// vale o esforço de tornar isso configurável pela UI agora -- não há
// evidência de que os valores hardcoded em app/api/agent-worker/route.ts
// precisem mudar por cliente ou com frequência. Fica só leitura, pra não
// deixar o item da sidebar sem conteúdo; se virar necessidade real, aí sim
// cria a tabela agent_settings.
const SETTINGS = [
  { label: "Limiar de queda pra anomalia de insight", value: "30%", source: "ANOMALY_DROP_THRESHOLD" },
  { label: "Janela de comparação (dias)", value: "7", source: "ANOMALY_LOOKBACK_DAYS" },
];

export default function AgentsSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações do agente</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Parâmetros fixos no código hoje (sem UI de edição) — sem evidência ainda de que precisem virar
          configuráveis por cliente.
        </p>
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-neutral-100">
          {SETTINGS.map((setting) => (
            <li key={setting.source} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{setting.label}</p>
                <p className="text-xs text-neutral-400">
                  <code className="font-mono">{setting.source}</code> em app/api/agent-worker/route.ts
                </p>
              </div>
              <span className="text-sm text-neutral-600">{setting.value}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
