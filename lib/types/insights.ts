// Tipos locais para social_accounts / insights_snapshots, espelhando supabase/migrations/001_schema.sql.
// Metric names ainda não são fixos (fetchAccountInsights em lib/meta-api/index.ts está pendente de
// credenciais Meta), então `metric` é tratado como string livre em todo o frontend.

export type SocialPlatform = "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube";

export interface SocialAccount {
  id: string;
  client_id: string;
  platform: SocialPlatform;
  last_sync: string | null;
  created_at: string;
}

export interface InsightSnapshot {
  id: string;
  social_account_id: string;
  snapshot_date: string;
  metric: string;
  value: number;
  created_at: string;
}
