import { Card } from "@/components/ui/Card";

// Decidido em 2026-08-13 (design/INFORMATION_ARCHITECTURE.md seção 5.2): link
// fixo pro painel do GensBot, sem health-check real -- GensBot é um serviço
// externo já em produção (repo próprio) que não expõe status de saúde hoje.
export default function AgentsIntegrationsPage() {
  const gensbotUrl = process.env.NEXT_PUBLIC_GENSBOT_URL;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Integrações</h1>
        <p className="mt-1 text-sm text-neutral-500">Serviços externos conectados à plataforma.</p>
      </div>

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-neutral-900">GensBot</p>
          <p className="mt-1 text-xs text-neutral-500">Automação de Direct e mensagens (serviço externo).</p>
        </div>
        {gensbotUrl ? (
          <a
            href={gensbotUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Abrir painel
          </a>
        ) : (
          <span className="text-xs text-neutral-400">
            Configure <code className="font-mono">NEXT_PUBLIC_GENSBOT_URL</code> pra habilitar o link.
          </span>
        )}
      </Card>
    </div>
  );
}
