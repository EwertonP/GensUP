export function LinkStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
        isActive ? "bg-status-approved" : "bg-neutral-400"
      }`}
    >
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}
