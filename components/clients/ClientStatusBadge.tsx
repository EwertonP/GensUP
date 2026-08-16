import tokens from "@/design-tokens.json";
import type { ClientStatus } from "@/lib/types/client";

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};

// Reaproveita chaves semanticamente equivalentes de colors.status (mesmo
// padrão do StageBadge do Pipeline) em vez de inventar paleta nova.
const STATUS_TOKEN_KEYS: Record<ClientStatus, string> = {
  active: "success",
  paused: "warning",
  archived: "draft",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const color = (tokens.colors.status as Record<string, string>)[STATUS_TOKEN_KEYS[status]];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
