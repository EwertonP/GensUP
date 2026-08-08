import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Usa a service_role key: ignora RLS. Nunca expor ao client.
// Uso restrito a: edge functions, jobs internos, rotas server-only
// que precisam operar entre tenants (ex: admin console).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
