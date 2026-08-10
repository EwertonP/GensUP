# Estrutura do Frontend

Next.js 16 (App Router, Turbopack, TypeScript). Rotas por grupo:

- `app/(auth)/` — login/signup
- `app/(client-portal)/` — dashboard, approvals (player de vídeo, carrossel)
- `app/(agency-portal)/` — kanban, gensbot (Fase 3), link-in-bio (Fase 3)
- `app/api/**` — já entregue pelo Backend (não recriar aqui)

Componentes:
- `components/ui/` — átomos do Design System (Button, Input, Card, StatusBadge)
- `components/video-player/`, `components/carousel-viewer/`, `components/kanban-board/` — componentes de negócio (versão protótipo da Fase 0; refinar na Fase 1)

Data layer: `lib/supabase/client.ts` (browser) + `server.ts`/`admin.ts` (já existiam, do Backend). React Query via `app/providers.tsx`.

Path aliases: `@/*`, `@/app/*`, `@/components/*`, `@/lib/*` (ver `tsconfig.json`).

Validado: `npm run type-check`, `npm run lint` e `npm run build` passam limpos (Next.js 16.3.0, sem vulnerabilidades conhecidas no `npm audit`).
