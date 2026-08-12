import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/approvals", label: "Aprovações" },
  { href: "/insights", label: "Insights" },
];

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl p-6">
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
