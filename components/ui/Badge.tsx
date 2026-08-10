import tokens from "@/design-tokens.json";

type Status = "draft" | "in_review" | "changes_requested" | "approved" | "scheduled" | "published";

const labels: Record<Status, string> = {
  draft: "Rascunho",
  in_review: "Em aprovação",
  changes_requested: "Ajuste solicitado",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
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
