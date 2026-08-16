import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import type { ContentItem } from "@/lib/types/content";

const TYPE_LABEL: Record<ContentItem["type"], string> = {
  image: "Imagem",
  video: "Vídeo",
  carousel: "Carrossel",
  reel: "Reel",
  story: "Story",
};

export default async function ApprovalsListPage() {
  const supabase = await createClient();
  // RLS filtra automaticamente pelo client_id do usuário autenticado.
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as ContentItem[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Peças para aprovação</h1>

      {error && (
        <p className="text-sm text-status-error">Erro ao carregar peças: {error.message}</p>
      )}

      {!error && items.length === 0 && (
        <p className="text-sm text-neutral-500">Nenhuma peça disponível no momento.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={`/approvals/${item.id}`}>
            <Card className="flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-neutral-700">
                  {TYPE_LABEL[item.type] ?? item.type}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <h2 className="text-base font-semibold text-neutral-900">
                {item.title ?? `Peça ${item.id.slice(0, 8)}`}
              </h2>
              <p className="text-xs text-neutral-400">
                Criado em {new Date(item.created_at).toLocaleDateString("pt-BR")}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
