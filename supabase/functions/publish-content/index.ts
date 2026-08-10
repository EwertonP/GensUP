// Edge Function: publish-content
// Publica um content_item aprovado (status = 'scheduled') na plataforma social correspondente.
// Disparada por cron/scheduler (fora do escopo da Fase 0) ou manualmente por uma rota admin futura.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { content_item_id } = await req.json();
  if (!content_item_id) {
    return new Response(JSON.stringify({ error: "content_item_id é obrigatório" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: item, error } = await supabase
    .from("content_items")
    .select("id, client_id, status")
    .eq("id", content_item_id)
    .single();

  if (error || !item) {
    return new Response(JSON.stringify({ error: "Item não encontrado" }), { status: 404 });
  }

  if (item.status !== "scheduled") {
    return new Response(
      JSON.stringify({ error: `Item precisa estar 'scheduled', está '${item.status}'` }),
      { status: 400 }
    );
  }

  // TODO: publicar via Graph API usando a social_account correspondente
  // TODO: em sucesso, update content_items.status = 'published'

  return new Response(JSON.stringify({ published: false, reason: "not implemented" }), { status: 501 });
});
