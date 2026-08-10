# Design System — Fase 0

Versão code-first (sem arquivo Figma ainda — ver `CLAUDE_DESIGN.md` para o checklist completo de Figma/Code Connect, que fica para quando houver tempo de um designer dedicado).

## Tokens
Fonte única: `design-tokens.json` na raiz, consumido por `tailwind.config.ts`.

- **Cores**: `primary`, `secondary`, `neutral` (escala), `status` (rascunho/em_aprovacao/ajuste/aprovado/publicado + success/warning/error/info)
- **Tipografia**: Inter, escala xs→3xl, pesos 400–700
- **Spacing**: escala base 4px
- **Radius**: none→full
- **Shadows**: sm/md/lg
- **Breakpoints**: tablet 640px, desktop 1024px

## Componentes atômicos entregues
`components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx` (StatusBadge lê cor direto de `design-tokens.json`).

## Pendente (não bloqueia Fase 1)
- Arquivo Figma real + Code Connect
- Componentes compostos (Modal, Alert, Tabs, Dropdown, Toast)
- Dark mode (tokens duplicados)
