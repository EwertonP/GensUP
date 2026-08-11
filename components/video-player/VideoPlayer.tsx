"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VideoFeedback } from "@/lib/types/content";

interface VideoPlayerProps {
  contentItemId: string;
  src: string;
  onRequestComment?: (timestampSeconds: number) => void;
}

async function fetchVideoFeedback(contentItemId: string): Promise<VideoFeedback[]> {
  const res = await fetch(`/api/feedback/video?content_item_id=${encodeURIComponent(contentItemId)}`);
  if (!res.ok) throw new Error("Falha ao carregar comentários");
  return res.json();
}

interface PostVideoFeedbackPayload {
  content_item_id: string;
  timestamp_seconds: number;
  comment: string;
}

async function postVideoFeedback(payload: PostVideoFeedbackPayload): Promise<VideoFeedback> {
  const res = await fetch("/api/feedback/video", {
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

async function resolveVideoFeedback(id: string): Promise<VideoFeedback> {
  const res = await fetch(`/api/feedback/video/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "resolved" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha ao marcar como resolvido");
  }
  return res.json();
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function VideoPlayer({ contentItemId, src, onRequestComment }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState(0);
  const [comment, setComment] = useState("");
  const [lastConfirmedAt, setLastConfirmedAt] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const feedbackQuery = useQuery({
    queryKey: ["video-feedback", contentItemId],
    queryFn: () => fetchVideoFeedback(contentItemId),
  });

  const mutation = useMutation({
    mutationFn: postVideoFeedback,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["video-feedback", contentItemId] });
      setComment("");
      setLastConfirmedAt(created.timestamp_seconds);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: resolveVideoFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-feedback", contentItemId] });
    },
  });

  function handlePause() {
    setPaused(true);
    setLastConfirmedAt(null);
    const t = Math.floor(videoRef.current?.currentTime ?? 0);
    setPausedAt(t);
    onRequestComment?.(t);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;
    mutation.mutate({ content_item_id: contentItemId, timestamp_seconds: pausedAt, comment: trimmed });
  }

  function jumpTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.pause();
    }
  }

  const comments = feedbackQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
      <div className="flex-1">
        <video
          ref={videoRef}
          src={src}
          controls
          className="w-full rounded-lg bg-black"
          onPause={handlePause}
          onPlay={() => setPaused(false)}
        />
        {comments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {comments.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => jumpTo(f.timestamp_seconds)}
                title={f.comment}
                className="rounded-full bg-status-changes_requested/10 px-2 py-0.5 text-xs font-medium text-status-changes_requested hover:bg-status-changes_requested/20"
              >
                {formatTime(f.timestamp_seconds)}
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="w-full shrink-0 border-t border-neutral-200 pt-4 md:w-80 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        {paused && (
          <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
            <p className="text-sm text-neutral-500">
              Pausado em {formatTime(pausedAt)} — comentário vinculado a este ponto.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o ajuste necessário..."
              rows={3}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={mutation.isPending || !comment.trim()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Enviando..." : "Solicitar ajuste"}
            </button>
            {mutation.isError && <p className="text-xs text-status-error">{(mutation.error as Error).message}</p>}
            {lastConfirmedAt !== null && !mutation.isPending && (
              <p className="text-xs text-status-approved">Comentário registrado em {formatTime(lastConfirmedAt)}.</p>
            )}
          </form>
        )}

        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Comentários</h4>
        {feedbackQuery.isLoading && <p className="text-sm text-neutral-400">Carregando...</p>}
        {feedbackQuery.isError && <p className="text-sm text-status-error">Erro ao carregar comentários.</p>}
        <ul className="flex flex-col gap-2">
          {comments.map((f) => {
            const isResolved = f.status === "resolved";
            return (
              <li
                key={f.id}
                className={`rounded-md border border-neutral-200 p-2 text-sm ${isResolved ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => jumpTo(f.timestamp_seconds)}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {formatTime(f.timestamp_seconds)}
                  </button>
                  {isResolved ? (
                    <span className="rounded-full bg-status-approved/10 px-2 py-0.5 text-xs font-medium text-status-approved">
                      Resolvido
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resolveMutation.mutate(f.id)}
                      disabled={resolveMutation.isPending}
                      className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                    >
                      Marcar como resolvido
                    </button>
                  )}
                </div>
                <p className={`mt-1 text-neutral-700 ${isResolved ? "line-through" : ""}`}>{f.comment}</p>
              </li>
            );
          })}
          {!feedbackQuery.isLoading && comments.length === 0 && (
            <li className="text-sm text-neutral-400">Nenhum comentário ainda.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
