import { requireAuth } from "@/lib/auth/middleware";
import { MonthlyReportDownload } from "@/components/insights/MonthlyReportDownload";

// Decidido em 2026-08-13 (design/INFORMATION_ARCHITECTURE.md seção 6.1):
// gerar sob demanda sempre, sem salvar PDFs no Storage -- reaproveita o
// mesmo componente/rota já usados em /insights, sem infra nova.
export default async function ReportsPage() {
  const { role, clientId } = await requireAuth();
  const canPickClient = role === "agencia" || role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Relatórios mensais</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gera um PDF sob demanda com as métricas agregadas do cliente e mês selecionados.
        </p>
      </div>

      <MonthlyReportDownload clientId={clientId} canPickClient={canPickClient} />
    </div>
  );
}
