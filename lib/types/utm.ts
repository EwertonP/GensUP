// Tipos locais para utm_links / link_clicks — espelha supabase/migrations/008_utm_links.sql.

export interface UtmLink {
  id: string;
  client_id: string;
  slug: string;
  title: string;
  destination_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface LinkClick {
  id: string;
  utm_link_id: string;
  clicked_at: string;
  referrer: string | null;
  user_agent: string | null;
  country: string | null;
}
