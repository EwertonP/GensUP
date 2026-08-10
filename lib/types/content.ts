// Tipos locais para content_items / feedback, espelhando supabase/migrations/001_schema.sql.
// lib/supabase/types.ts ainda é um placeholder (`Database = any`), então tipamos aqui
// manualmente até o Backend gerar os tipos reais via `supabase gen types`.

export type ContentItemType = "image" | "video" | "carousel" | "reel" | "story";

export type ContentItemStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "published";

export interface ContentItem {
  id: string;
  client_id: string;
  type: ContentItemType;
  status: ContentItemStatus;
  created_by: string | null;
  created_at: string;
  // NÃO existem ainda em supabase/migrations/001_schema.sql (só tem id/client_id/type/status/
  // created_by/created_at). Assumidos como opcionais com fallback na UI até o Backend confirmar
  // os nomes reais das colunas de título/mídia (provavelmente numa migration 003 futura).
  title?: string | null;
  caption?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  // Para type === "carousel": lista de URLs, uma por página. Nome/formato hipotético
  // (pode ser jsonb, tabela separada `carousel_pages`, etc.) — CONFIRMAR com o Backend.
  media_urls?: string[] | null;
}

export type FeedbackStatus = "open" | "resolved";

export interface VideoFeedback {
  id: string;
  content_item_id: string;
  timestamp_seconds: number;
  comment: string;
  status: FeedbackStatus;
  created_by: string | null;
  created_at: string;
}

export interface CarouselFeedback {
  id: string;
  content_item_id: string;
  page_number: number;
  is_cta: boolean;
  comment: string;
  status: FeedbackStatus;
  created_by: string | null;
  created_at: string;
}
