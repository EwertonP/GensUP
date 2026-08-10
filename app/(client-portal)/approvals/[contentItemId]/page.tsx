import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VideoPlayer } from "@/components/video-player/VideoPlayer";
import { CarouselViewer } from "@/components/carousel-viewer/CarouselViewer";
import { StatusBadge } from "@/components/ui/Badge";
import { ApproveButton } from "@/components/approvals/ApproveButton";
import type { ContentItem, ContentPage } from "@/lib/types/content";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ contentItemId: string }>;
}) {
  const { contentItemId } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as ContentItem;
  const canApprove = item.status === "in_review";

  let pages: ContentPage[] = [];
  if (item.type === "carousel") {
    const { data: pagesData } = await supabase
      .from("content_pages")
      .select("*")
      .eq("content_item_id", item.id)
      .order("page_number", { ascending: true });
    pages = (pagesData as ContentPage[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{item.title ?? `Aprovação — ${item.id.slice(0, 8)}`}</h1>
          <div className="mt-1">
            <StatusBadge status={item.status} />
          </div>
        </div>
        <ApproveButton contentItemId={item.id} disabled={!canApprove} />
      </div>

      {(item.type === "reel" || item.type === "video") &&
        (item.media_url ? (
          <VideoPlayer contentItemId={item.id} src={item.media_url} />
        ) : (
          <p className="text-sm text-neutral-500">Vídeo ainda não disponível para este item.</p>
        ))}

      {item.type === "carousel" &&
        (pages.length > 0 ? (
          <CarouselViewer contentItemId={item.id} pages={pages} />
        ) : (
          <p className="text-sm text-neutral-500">Imagens do carrossel ainda não disponíveis para este item.</p>
        ))}

      {(item.type === "image" || item.type === "story") &&
        (item.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.media_url} alt={item.title ?? "Conteúdo"} className="max-h-[480px] rounded-lg border border-neutral-200" />
        ) : (
          <p className="text-sm text-neutral-500">Mídia ainda não disponível para este item.</p>
        ))}
    </div>
  );
}
