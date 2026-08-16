// Tipos locais para clients, espelhando supabase/migrations/001_schema.sql.

export type ClientStatus = "active" | "paused" | "archived";

export interface Client {
  id: string;
  name: string;
  slug: string | null;
  status: ClientStatus;
  created_at: string;
}
