// Pill cinza claro com número -- padrão único pra contagem em listas/abas
// (design/DESIGN.md §10.1-10.2), em vez de cada tela inventar o próprio.
export function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500">
      {count}
    </span>
  );
}
