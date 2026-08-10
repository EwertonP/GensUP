import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";

// Página pública de bio por cliente ("linktree" da agência) — lista os
// utm_links ativos do cliente como botões, cada um já rastreado via /l/[slug].
export default async function ClientBioPage({ params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, slug")
    .eq("slug", clientSlug)
    .maybeSingle();

  if (!client) notFound();

  const { data: links } = await supabase
    .from("utm_links")
    .select("slug, title")
    .eq("client_id", client.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold text-neutral-900">{client.name}</h1>
      <div className="flex w-full flex-col gap-3">
        {(links ?? []).map((link) => (
          <a key={link.slug} href={`/l/${link.slug}`}>
            <Card className="px-4 py-3 text-center text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50">
              {link.title}
            </Card>
          </a>
        ))}
        {(links ?? []).length === 0 && (
          <p className="text-center text-sm text-neutral-500">Nenhum link ativo no momento.</p>
        )}
      </div>
    </main>
  );
}
