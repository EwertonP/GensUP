import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Plataforma Agência",
  description: "Aprovação de conteúdo, insights e CRM para clientes da agência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-neutral-50 text-neutral-900 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
