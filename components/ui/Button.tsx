import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

// Hierarquia visual (ver design/design-system-notes.md): só primary (ação
// desejada) e danger (ação irreversível) são preenchidos. Todo o resto é
// chip/contorno -- nunca preenchido, pra não competir visualmente.
const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
  danger: "bg-status-error text-white hover:opacity-90",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
