import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// design-tokens.json define a marca como Inter -- até agora ela nunca foi
// carregada de fato (sem next/font, sem <link>), então tudo caía no fallback
// do sistema. next/font hospeda o arquivo localmente (sem layout shift) e
// expõe a variável --font-inter usada em tailwind.config.ts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Plataforma Agência",
  description: "Aprovação de conteúdo, insights e CRM para clientes da agência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-neutral-50 text-neutral-900 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
