import tokens from "@/design-tokens.json";
import type { ProspectStage } from "@/lib/types/crm";

// Badge irmão de StatusBadge (union type diferente) — reaproveita as mesmas
// chaves semanticamente equivalentes de colors.status para não inventar paleta nova.
const STAGE_LABELS: Record<ProspectStage, string> = {
  novo: "Novo",
  contatado: "Contatado",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

const STAGE_TOKEN_KEYS: Record<ProspectStage, string> = {
  novo: "draft",
  contatado: "in_review",
  proposta: "scheduled",
  fechado: "approved",
  perdido: "error",
};

export function StageBadge({ stage }: { stage: ProspectStage }) {
  const color = (tokens.colors.status as Record<string, string>)[STAGE_TOKEN_KEYS[stage]];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
