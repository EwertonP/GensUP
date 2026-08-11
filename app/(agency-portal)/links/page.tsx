import { UtmLinksManager } from "@/components/utm-links/UtmLinksManager";

export default async function LinksPage() {
  // Autorização real fica nas rotas de API (requireRole "agencia"/"admin") e no RLS,
  // mesmo padrão do restante do portal da agência (ver kanban/page.tsx).
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Links UTM</h1>
          <p className="text-sm text-neutral-500">
            Crie links rastreáveis para campanhas e gerencie o Link na Bio de cada cliente.
          </p>
        </div>
      </div>

      <UtmLinksManager />
    </div>
  );
}
