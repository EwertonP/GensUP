import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/middleware";
import { Card } from "@/components/ui/Card";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";
import { UtmClicksPanel } from "@/components/insights/UtmClicksPanel";
import type { SocialAccount, SocialPlatform } from "@/lib/types/insights";

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

export default async function InsightsPage() {
  const { role } = await requireAuth();
  const canSync = role === "agencia" || role === "admin";
  const supabase = await createClient();
  // RLS filtra automaticamente pelo client_id do usuário autenticado (ver 002_rls_policies.sql).
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, client_id, platform, last_sync, created_at")
    .order("created_at", { ascending: true });

  const accounts = (data ?? []) as SocialAccount[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Insights</h1>

      <UtmClicksPanel />

      {error && <p className="text-sm text-status-error">Erro ao carregar contas conectadas: {error.message}</p>}

      {!error && accounts.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-neutral-500">
            Nenhuma conta social conectada ainda. Conecte sua conta do Instagram para acompanhar as métricas por
            aqui.
          </p>
          <a
            href="/api/auth/instagram"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Conectar Instagram
          </a>
        </Card>
      )}

      {!error &&
        accounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-neutral-900">
                {PLATFORM_LABEL[account.platform] ?? account.platform}
              </h2>
              <span className="text-xs text-neutral-400">
                {account.last_sync
                  ? `Última sincronização: ${new Date(account.last_sync).toLocaleString("pt-BR")}`
                  : "Ainda não sincronizado"}
              </span>
            </div>
            <InsightsDashboard socialAccountId={account.id} canSync={canSync} />
          </div>
        ))}
    </div>
  );
}
