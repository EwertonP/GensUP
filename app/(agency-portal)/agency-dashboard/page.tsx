import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function getKpis() {
  const supabase = await createClient();

  const [activeClients, pendingApprovals, openProspects, monthlyClicks] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content_items").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    supabase.from("prospects").select("id", { count: "exact", head: true }).not("stage", "in", "(fechado,perdido)"),
    supabase
      .from("link_clicks")
      .select("id", { count: "exact", head: true })
      .gte("clicked_at", startOfMonthISO()),
  ]);

  return {
    activeClients: activeClients.count ?? 0,
    pendingApprovals: pendingApprovals.count ?? 0,
    openProspects: openProspects.count ?? 0,
    monthlyClicks: monthlyClicks.count ?? 0,
  };
}

export default async function AgencyDashboardPage() {
  const kpis = await getKpis();

  const cards = [
    { label: "Clientes ativos", value: kpis.activeClients },
    { label: "Peças aguardando aprovação", value: kpis.pendingApprovals },
    { label: "Prospects em aberto", value: kpis.openProspects },
    { label: "Cliques em links no mês", value: kpis.monthlyClicks },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900">{card.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
