"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ActivityTypeBadge } from "@/components/activities/ActivityTypeBadge";
import type { ActivityType } from "@/lib/types/crm";

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

const TYPE_FILTERS: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "email", label: "E-mail" },
  { value: "ligacao", label: "Ligação" },
  { value: "nota", label: "Nota" },
  { value: "reuniao", label: "Reunião" },
];

export function ActivitiesLog({ entries }: { entries: ActivityLogEntry[] }) {
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [search, setSearch] = useState("");

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
        <div className="flex gap-2">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
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
        <Card className="overflow-hidden">
          <ul className="divide-y divide-neutral-100">
            {filtered.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ActivityTypeBadge type={entry.type} />
                  {entry.targetHref ? (
                    <Link href={entry.targetHref} className="text-sm font-medium text-primary-700 hover:underline">
                      {entry.targetName}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-neutral-700">{entry.targetName}</span>
                  )}
                  <span className="text-xs text-neutral-400">
                    {entry.authorEmail ?? "Sistema"} · {new Date(entry.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {entry.body && <p className="whitespace-pre-wrap text-sm text-neutral-600">{entry.body}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
