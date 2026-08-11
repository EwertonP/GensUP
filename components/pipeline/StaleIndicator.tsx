"use client";

// Indicador de tempo parado na coluna atual do pipeline. Usa `created_at` como
// aproximação de `stage_updated_at` (campo não existe no schema atual — ver
// design/sales-pipeline-spec.md seção 2.4/7.2, ponto para validação humana).
export function StaleIndicator({ updatedAt }: { updatedAt: string }) {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
  if (days < 3) return null;
  const tone =
    days >= 14
      ? "bg-status-error/10 text-status-error"
      : days >= 7
        ? "bg-status-warning/10 text-status-warning"
        : "bg-neutral-100 text-neutral-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {days}d parado
    </span>
  );
}
