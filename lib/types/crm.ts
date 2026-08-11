// Tipos locais para prospects / activities, espelhando supabase/migrations/013_sales_crm.sql.

export type ProspectStage = "novo" | "contatado" | "proposta" | "fechado" | "perdido";

export interface Prospect {
  id: string;
  name: string;
  company: string | null;
  stage: ProspectStage;
  owner_user_id: string | null;
  source: string | null;
  converted_client_id: string | null;
  created_at: string;
}

export type ActivityType = "email" | "ligacao" | "nota" | "reuniao";

export interface Activity {
  id: string;
  prospect_id: string | null;
  client_id: string | null;
  type: ActivityType;
  body: string | null;
  created_by: string | null;
  created_at: string;
}
