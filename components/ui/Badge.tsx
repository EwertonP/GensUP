import tokens from "@/design-tokens.json";

type Status = "rascunho" | "em_aprovacao" | "ajuste" | "aprovado" | "publicado";

const labels: Record<Status, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  ajuste: "Ajuste solicitado",
  aprovado: "Aprovado",
  publicado: "Publicado",
};

export function StatusBadge({ status }: { status: Status }) {
  const color = (tokens.colors.status as Record<string, string>)[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {labels[status]}
    </span>
  );
}
