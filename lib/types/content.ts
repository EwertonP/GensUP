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
  // Colunas adicionadas em supabase/migrations/006_content_media.sql
  title: string | null;
  caption: string | null;
  media_url: string | null;
}

// Uma linha por página de carrossel — supabase/migrations/006_content_media.sql
export interface ContentPage {
  id: string;
  content_item_id: string;
  page_number: number;
  media_url: string;
  is_cta: boolean;
  created_at: string;
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
