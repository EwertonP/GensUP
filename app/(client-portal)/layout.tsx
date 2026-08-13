import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type SidebarGroup } from "@/components/layout/Sidebar";

const NAV_GROUPS: SidebarGroup[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Aprovações", href: "/approvals" },
  { label: "Insights", href: "/insights" },
];

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar groups={NAV_GROUPS} title="Portal do Cliente" />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
