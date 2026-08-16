import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import type { ContentItem, ContentItemStatus } from "@/lib/types/content";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Grid fixo de 6 semanas (42 dias, começando no domingo antes ou no 1º dia do
// mês) -- cobre qualquer mês sem lógica condicional de parada.
function buildMonthGrid(year: number, month: number): Date[][] {
  const start = new Date(year, month, 1);
  start.setDate(start.getDate() - start.getDay());

  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function EditorialCalendar({ year, month }: { year: number; month: number }) {
  const supabase = await createClient();

  const rangeStart = new Date(year, month, 1).toISOString();
  const rangeEnd = new Date(year, month + 1, 1).toISOString();

  const { data, error } = await supabase
    .from("content_items")
    .select("id, title, status, type, client_id, scheduled_at, published_at, clients(name)")
    .or(
      `and(scheduled_at.gte.${rangeStart},scheduled_at.lt.${rangeEnd}),and(published_at.gte.${rangeStart},published_at.lt.${rangeEnd})`
    );

  const itemsByDay = new Map<string, { item: ContentItem; clientName: string }[]>();
  for (const row of data ?? []) {
    const when = row.published_at ?? row.scheduled_at;
    if (!when) continue;
    const key = dateKey(new Date(when));
    const clientName = (row.clients as unknown as { name?: string } | null)?.name ?? "—";
    const list = itemsByDay.get(key) ?? [];
    list.push({ item: row as unknown as ContentItem, clientName });
    itemsByDay.set(key, list);
  }

  const weeks = buildMonthGrid(year, month);

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Calendário editorial</h1>
          <p className="mt-1 text-sm text-neutral-500 capitalize">{monthLabel(year, month)}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/content/calendar?year=${prevMonth.year}&month=${prevMonth.month + 1}`}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            ← Anterior
          </Link>
          <Link
            href={`/content/calendar?year=${nextMonth.year}&month=${nextMonth.month + 1}`}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Próximo →
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-status-error">Erro ao carregar o calendário: {error.message}</p>}

      {!error && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weeks.flat().map((day) => {
              const inMonth = day.getMonth() === month;
              const key = dateKey(day);
              const dayItems = itemsByDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={`min-h-[96px] border-b border-r border-neutral-100 p-2 last:border-r-0 ${
                    inMonth ? "bg-white" : "bg-neutral-50"
                  }`}
                >
                  <span className={`text-xs ${inMonth ? "text-neutral-500" : "text-neutral-300"}`}>{day.getDate()}</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayItems.map(({ item, clientName }) => (
                      <div key={item.id} className="rounded bg-neutral-100 px-1.5 py-1 text-[11px]">
                        <p className="truncate font-medium text-neutral-700" title={item.title ?? undefined}>
                          {clientName}: {item.title ?? "sem título"}
                        </p>
                        <StatusBadge status={item.status as ContentItemStatus} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
