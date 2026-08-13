import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type SidebarGroup } from "@/components/layout/Sidebar";

const NAV_GROUPS: SidebarGroup[] = [
  { label: "Dashboard", href: "/agency-dashboard" },
  {
    label: "CRM",
    items: [
      { href: "/pipeline", label: "Pipeline" },
      { href: "/clients", label: "Clientes" },
      { href: "/activities", label: "Atividades" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { href: "/kanban", label: "Kanban" },
      { href: "/content/calendar", label: "Calendário editorial" },
      { href: "/content/library", label: "Biblioteca de mídia" },
    ],
  },
  {
    label: "Links",
    items: [
      { href: "/links", label: "Gerador de UTM" },
      { href: "/links/bio", label: "Link na Bio" },
      { href: "/links/clicks", label: "Relatório de cliques" },
    ],
  },
  {
    label: "Agentes de IA",
    items: [
      { href: "/agents", label: "Atividade" },
      { href: "/agents/integrations", label: "Integrações" },
      { href: "/agents/settings", label: "Configurações" },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { href: "/reports", label: "Relatórios mensais" },
      { href: "/reports/insights", label: "Insights agregados" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/settings/users", label: "Usuários da agência" },
      { href: "/settings/profile", label: "Meu perfil" },
    ],
  },
];

export default async function AgencyPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = (user.app_metadata as { role?: string }).role;
  if (role !== "agencia" && role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar groups={NAV_GROUPS} title="Portal da Agência" />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
