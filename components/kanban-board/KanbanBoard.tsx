const COLUMNS = ["rascunho", "em_aprovacao", "ajuste", "aprovado", "publicado"] as const;

interface KanbanItem {
  id: string;
  title: string;
  status: (typeof COLUMNS)[number];
}

export function KanbanBoard({ items }: { items: KanbanItem[] }) {
  return (
    <div className="grid grid-cols-5 gap-4">
      {COLUMNS.map((col) => (
        <div key={col} className="rounded-lg bg-neutral-100 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-500">{col}</h3>
          <div className="flex flex-col gap-2">
            {items.filter((i) => i.status === col).map((item) => (
              <div key={item.id} className="rounded-md bg-white p-2 text-sm shadow-sm">
                {item.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
