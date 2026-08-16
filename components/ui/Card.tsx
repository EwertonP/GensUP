interface CardProps {
  children: React.ReactNode;
  className?: string;
  // Elevação sobe com interação (ver design/DESIGN.md, seção 4) -- um card
  // que não é clicável não deveria ganhar shadow-md decorativa.
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false }: CardProps) {
  const interactiveClasses = interactive
    ? "shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
    : "shadow-sm";
  return (
    <div className={`rounded-lg border border-neutral-200/80 bg-white ${interactiveClasses} ${className}`}>{children}</div>
  );
}
