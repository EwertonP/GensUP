import type { ActivityType } from "@/lib/types/crm";

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  email: "Email",
  ligacao: "Ligação",
  nota: "Nota",
  reuniao: "Reunião",
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  email: "bg-blue-100 text-blue-700",
  ligacao: "bg-emerald-100 text-emerald-700",
  nota: "bg-neutral-100 text-neutral-600",
  reuniao: "bg-purple-100 text-purple-700",
};

export function ActivityTypeBadge({ type }: { type: ActivityType | string }) {
  const key = type as ActivityType;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        ACTIVITY_COLORS[key] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {ACTIVITY_LABELS[key] ?? type}
    </span>
  );
}
