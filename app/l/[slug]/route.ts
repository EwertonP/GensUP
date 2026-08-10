import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Rota pública de redirect do gerador de UTM — ver "Gerador de Link UTM + Link
// na Bio" em plataforma-agencia-arquitetura.md. Usa service_role (ignora RLS)
// porque quem clica no link não está autenticado na plataforma.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: link } = await supabase
    .from("utm_links")
    .select("id, destination_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!link) {
    return NextResponse.redirect(new URL("/", req.url), 302);
  }

  // Clique é fato observado, não "chutado" — grava sem esperar (best-effort,
  // não deve atrasar nem quebrar o redirect se a inserção falhar).
  void supabase.from("link_clicks").insert({
    utm_link_id: link.id,
    referrer: req.headers.get("referer"),
    user_agent: req.headers.get("user-agent"),
    country: req.headers.get("x-vercel-ip-country"),
  });

  const destination = new URL(link.destination_url);
  if (link.utm_source) destination.searchParams.set("utm_source", link.utm_source);
  if (link.utm_medium) destination.searchParams.set("utm_medium", link.utm_medium);
  if (link.utm_campaign) destination.searchParams.set("utm_campaign", link.utm_campaign);
  if (link.utm_content) destination.searchParams.set("utm_content", link.utm_content);
  if (link.utm_term) destination.searchParams.set("utm_term", link.utm_term);

  return NextResponse.redirect(destination, 302);
}
