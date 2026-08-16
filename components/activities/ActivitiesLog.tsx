"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { ActivityTypeBadge } from "@/components/activities/ActivityTypeBadge";
import type { ActivityType } from "@/lib/types/crm";

// "há 2 horas" no estilo da referência (Kelp) -- timestamp relativo no canto
// do card em vez de data/hora completa sempre.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export interface ActivityLogEntry {
  id: string;
  type: ActivityType | string;
  body: string | null;
  created_at: string;
  prospect_id: string | null;
  client_id: string | null;
  targetName: string;
  targetHref: string | null;
  authorEmail: string | null;
}

const TYPE_LABELS: Record<ActivityType, string> = {
  email: "E-mail",
  ligacao: "Ligação",
  nota: "Nota",
  reuniao: "Reunião",
};

export function ActivitiesLog({ entries }: { entries: ActivityLogEntry[] }) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [search, setSearch] = useState("");

  const tabs: TabItem[] = useMemo(() => {
    const counts = new Map<ActivityType, number>();
    for (const entry of entries) {
      const type = entry.type as ActivityType;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return [
      { value: "all", label: "Todos", count: entries.length },
      ...Object.entries(TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
        count: counts.get(value as ActivityType) ?? 0,
      })),
    ];
  }, [entries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (term && !entry.targetName.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [entries, typeFilter, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} value={typeFilter} onChange={(v) => setTypeFilter(v as ActivityType | "all")} />
        <input
          type="search"
          placeholder="Buscar por cliente ou prospect..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border border-neutral-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {filtered.length === 0 && (
        <Card className="p-6 text-sm text-neutral-500">Nenhuma atividade encontrada com esse filtro.</Card>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ActivityTypeBadge type={entry.type} />
                  {entry.targetHref ? (
                    <Link href={entry.targetHref} className="text-sm font-semibold text-neutral-900 hover:underline">
                      {entry.targetName}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-neutral-900">{entry.targetName}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-neutral-400">{formatRelativeTime(entry.created_at)}</span>
              </div>
              {entry.body && <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-600">{entry.body}</p>}
              <p className="mt-2 text-xs text-neutral-400">{entry.authorEmail ?? "Sistema"}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
