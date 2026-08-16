import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ClientStatusBadge } from "@/components/clients/ClientStatusBadge";
import { StatusBadge } from "@/components/ui/Badge";
import { ActivityTimeline } from "@/components/activities/ActivityTimeline";
import type { Client } from "@/lib/types/client";
import type { ContentItem, ContentItemStatus } from "@/lib/types/content";
import type { UtmLink } from "@/lib/types/utm";
import type { SocialAccount, SocialPlatform } from "@/lib/types/insights";

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

type LinkedUser = { id: string; email: string; role: string };

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase.from("clients").select("*").eq("id", id).single();
  if (clientError || !client) notFound();

  const [socialAccounts, recentContent, activeLinks, linkedUsers] = await Promise.all([
    supabase.from("social_accounts").select("id, client_id, platform, last_sync, created_at").eq("client_id", id),
    supabase
      .from("content_items")
      .select("id, client_id, type, status, created_by, created_at, title, caption, media_url")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("utm_links").select("*").eq("client_id", id).eq("is_active", true),
    supabase.from("users").select("id, email, role").eq("client_id", id),
  ]);

  const typedClient = client as Client;
  const accounts = (socialAccounts.data ?? []) as SocialAccount[];
  const contentItems = (recentContent.data ?? []) as ContentItem[];
  const utmLinks = (activeLinks.data ?? []) as UtmLink[];
  const users = (linkedUsers.data ?? []) as LinkedUser[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{typedClient.name}</h1>
            <ClientStatusBadge status={typedClient.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Cliente desde {new Date(typedClient.created_at).toLocaleDateString("pt-BR")}
            {typedClient.slug && (
              <>
                {" "}
                ·{" "}
                <a href={`/b/${typedClient.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline">
                  /b/{typedClient.slug}
                </a>
              </>
            )}
          </p>
        </div>
        <Link href="/clients" className="text-sm text-neutral-500 hover:underline">
          ← Voltar para clientes
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-neutral-900">Contas sociais conectadas</h2>
          {accounts.length === 0 && <p className="mt-3 text-sm text-neutral-500">Nenhuma conta conectada ainda.</p>}
          {accounts.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{PLATFORM_LABEL[account.platform] ?? account.platform}</span>
                  <span className="text-xs text-neutral-400">
                    {account.last_sync
                      ? `Sincronizado em ${new Date(account.last_sync).toLocaleDateString("pt-BR")}`
                      : "Não sincronizado"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-neutral-900">Usuários vinculados</h2>
          {users.length === 0 && <p className="mt-3 text-sm text-neutral-500">Nenhum login vinculado a este cliente.</p>}
          {users.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {users.map((user) => (
                <li key={user.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{user.email}</span>
                  <span className="text-xs text-neutral-400">{user.role}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Conteúdo recente</h2>
            <Link href="/kanban" className="text-xs text-primary-700 hover:underline">
              Ver kanban
            </Link>
          </div>
          {contentItems.length === 0 && <p className="mt-3 text-sm text-neutral-500">Nenhuma peça criada ainda.</p>}
          {contentItems.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {contentItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{item.title ?? "sem título"}</span>
                  <StatusBadge status={item.status as ContentItemStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Links UTM ativos</h2>
            <Link href="/links" className="text-xs text-primary-700 hover:underline">
              Gerenciar links
            </Link>
          </div>
          {utmLinks.length === 0 && <p className="mt-3 text-sm text-neutral-500">Nenhum link ativo.</p>}
          {utmLinks.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {utmLinks.map((link) => (
                <li key={link.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{link.title}</span>
                  <span className="text-xs text-neutral-400">/l/{link.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ActivityTimeline clientId={id} />
    </div>
  );
}
