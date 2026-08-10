"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CarouselFeedback } from "@/lib/types/content";

interface CarouselViewerProps {
  contentItemId: string;
  images: string[];
  ctaPageIndex?: number;
}

async function fetchCarouselFeedback(contentItemId: string): Promise<CarouselFeedback[]> {
  const res = await fetch(`/api/feedback/carousel?content_item_id=${encodeURIComponent(contentItemId)}`);
  if (!res.ok) throw new Error("Falha ao carregar comentários");
  return res.json();
}

interface PostCarouselFeedbackPayload {
  content_item_id: string;
  page_number: number;
  comment: string;
  is_cta: boolean;
}

async function postCarouselFeedback(payload: PostCarouselFeedbackPayload): Promise<CarouselFeedback> {
  const res = await fetch("/api/feedback/carousel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao enviar comentário");
  }
  return res.json();
}

export function CarouselViewer({ contentItemId, images, ctaPageIndex }: CarouselViewerProps) {
  const [page, setPage] = useState(0);
  const [comment, setComment] = useState("");
  const [isCta, setIsCta] = useState(false);

  const queryClient = useQueryClient();

  // page_number no banco é 1-based (página 1, 2, 3...); `page` no estado local é 0-based.
  const pageNumber = page + 1;

  const feedbackQuery = useQuery({
    queryKey: ["carousel-feedback", contentItemId],
    queryFn: () => fetchCarouselFeedback(contentItemId),
  });

  const mutation = useMutation({
    mutationFn: postCarouselFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carousel-feedback", contentItemId] });
      setComment("");
    },
  });

  function goToPage(next: number) {
    setPage(next);
    setComment("");
    setIsCta(next === ctaPageIndex);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;
    mutation.mutate({ content_item_id: contentItemId, page_number: pageNumber, comment: trimmed, is_cta: isCta });
  }

  const allComments = feedbackQuery.data ?? [];
  const pageComments = allComments.filter((f) => f.page_number === pageNumber);

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex flex-1 flex-col items-center gap-3">
        <img
          src={images[page]}
          alt={`Página ${pageNumber}`}
          className="max-h-[480px] rounded-lg border border-neutral-200"
        />
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <button onClick={() => goToPage(Math.max(0, page - 1))} disabled={page === 0}>
            ‹ Anterior
          </button>
          <span>
            Página {pageNumber} de {images.length}
            {page === ctaPageIndex && " · CTA"}
            {pageComments.length > 0 && ` · ${pageComments.length} comentário(s)`}
          </span>
          <button
            onClick={() => goToPage(Math.min(images.length - 1, page + 1))}
            disabled={page === images.length - 1}
          >
            Próxima ›
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Comentário sobre a página ${pageNumber}...`}
            rows={3}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" checked={isCta} onChange={(e) => setIsCta(e.target.checked)} />
            Página de CTA
          </label>
          <button
            type="submit"
            disabled={mutation.isPending || !comment.trim()}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Enviando..." : "Solicitar ajuste"}
          </button>
          {mutation.isError && <p className="text-xs text-status-error">{(mutation.error as Error).message}</p>}
          {mutation.isSuccess && !mutation.isPending && (
            <p className="text-xs text-status-approved">Comentário registrado na página {pageNumber}.</p>
          )}
        </form>
      </div>

      <aside className="w-full shrink-0 border-t border-neutral-200 pt-4 md:w-72 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
          Comentários — página {pageNumber}
        </h4>
        {feedbackQuery.isLoading && <p className="text-sm text-neutral-400">Carregando...</p>}
        {feedbackQuery.isError && <p className="text-sm text-status-error">Erro ao carregar comentários.</p>}
        <ul className="flex flex-col gap-2">
          {pageComments.map((f) => (
            <li key={f.id} className="rounded-md border border-neutral-200 p-2 text-sm">
              {f.is_cta && <span className="text-xs font-medium text-secondary-600">CTA · </span>}
              <p className="mt-1 text-neutral-700">{f.comment}</p>
            </li>
          ))}
          {!feedbackQuery.isLoading && pageComments.length === 0 && (
            <li className="text-sm text-neutral-400">Nenhum comentário nesta página ainda.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
