interface CardProps {
  children: React.ReactNode;
  className?: string;
  // Elevação sobe com interação (ver design/DESIGN.md, seção 4) -- um card
  // que não é clicável não deveria ganhar shadow-md decorativa.
  interactive?: boolean;
}

// v2 (design/DESIGN.md §4): elevação é por borda, não por sombra em repouso.
// Sombra só aparece quando o card responde a interação -- nunca decorativa.
export function Card({ children, className = "", interactive = false }: CardProps) {
  const interactiveClasses = interactive
    ? "transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.99]"
    : "";
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white ${interactiveClasses} ${className}`}>{children}</div>
  );
}
