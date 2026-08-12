import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

const NAV_ITEMS = [
  { href: "/kanban", label: "Kanban" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/links", label: "Links" },
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
    <div className="mx-auto max-w-6xl p-6">
      <nav className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-neutral-700 hover:text-primary-600">
              {item.label}
            </Link>
          ))}
        </div>
        <LogoutButton />
      </nav>
      {children}
    </div>
  );
}
