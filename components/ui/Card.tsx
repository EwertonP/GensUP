interface CardProps {
  children: React.ReactNode;
  className?: string;
  // Elevação sobe com interação (ver design/DESIGN.md, seção 4) -- um card
  // que não é clicável não deveria ganhar shadow-md decorativa.
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false }: CardProps) {
  const interactiveClasses = interactive ? "shadow-sm transition-shadow hover:shadow-md" : "shadow-sm";
  return <div className={`rounded-lg border border-neutral-200 bg-white ${interactiveClasses} ${className}`}>{children}</div>;
}
