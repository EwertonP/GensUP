import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban-board/KanbanBoard";
import type { ContentItem } from "@/lib/types/content";

const TYPE_LABEL: Record<ContentItem["type"], string> = {
  image: "Imagem",
  video: "Vídeo",
  carousel: "Carrossel",
  reel: "Reel",
  story: "Story",
};

export default async function KanbanPage() {
  const supabase = await createClient();
  // Visão da agência: RLS permite ver content_items de todos os clientes para role agencia/admin.
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });

  const items = ((data ?? []) as ContentItem[]).map((item) => ({
    id: item.id,
    title: item.title ?? `${TYPE_LABEL[item.type] ?? item.type} ${item.id.slice(0, 8)}`,
    status: item.status,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Kanban de produção</h1>
      {error && <p className="text-sm text-status-error">Erro ao carregar itens: {error.message}</p>}
      <KanbanBoard items={items} />
    </div>
  );
}
