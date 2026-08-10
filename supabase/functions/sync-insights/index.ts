// Edge Function: sync-insights
// Chamada por POST /api/insights/sync (route handler faz a autenticação de role).
// Usa service_role: ignora RLS, então filtra client_id manualmente.
//
// Fluxo: busca social_accounts.access_token -> chama Graph API -> grava insights_snapshots.
// Implementação real pendente de credenciais Meta (ver lib/meta-api no app principal).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { social_account_id } = await req.json();
  if (!social_account_id) {
    return new Response(JSON.stringify({ error: "social_account_id é obrigatório" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: account, error } = await supabase
    .from("social_accounts")
    .select("id, client_id, platform, access_token")
    .eq("id", social_account_id)
    .single();

  if (error || !account) {
    return new Response(JSON.stringify({ error: "Conta não encontrada" }), { status: 404 });
  }

  if (!account.access_token) {
    return new Response(
      JSON.stringify({ error: "access_token ausente — pendente de credenciais Meta" }),
      { status: 501 }
    );
  }

  // TODO: chamar Graph API e fazer upsert em insights_snapshots por (social_account_id, snapshot_date, metric)
  // TODO: atualizar social_accounts.last_sync = now()

  return new Response(JSON.stringify({ synced: false, reason: "not implemented" }), { status: 501 });
});
