// Badge irmão simples para `source` de prospect (texto livre, não é enum fechado
// no banco) — não estende StatusBadge, cuja union type não bate com esse campo.
export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
      {source}
    </span>
  );
}
