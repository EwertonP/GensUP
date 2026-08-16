# Notas de design system — aprendizados do Comp AI CRM (trycompai/crm)

Status: **decisão tomada e aplicada em 2026-08-12**.

- Cor de marca: verde musgo (`design-tokens.json` → `colors.primary`, escala `#f3f6ee` → `#43602e`, base `600` = `#54733a`).
- Regra de hierarquia aplicada em `components/ui/Button.tsx`: `primary`/`danger` preenchidos, `secondary` agora é contorno (`border-neutral-300`, fundo branco), `ghost` continua transparente.
- Pendente (não aplicado ainda, baixa prioridade): dark mode completo, escala de raio de borda idêntica à deles, regra de governança "não sobrescrever com `className`" formalizada num `CONVENTIONS.md` dedicado.
- Todas as páginas/componentes futuros devem seguir esses tokens — não introduzir cores novas fora de `design-tokens.json`.

Fonte: `docs/design.md` do repositório [trycompai/crm](https://github.com/trycompai/crm) (mesmo repo já analisado para o padrão de fila de agente — ver `plataforma-agencia-arquitetura.md`, seção "Pesquisa: aprendizados do Comp AI CRM").

## O que eles fazem

- **Fonte única de componentes**: tudo em `packages/ui` (shadcn/ui como base). Regra explícita: *"Do not override component styles with className"* — uma variação vira componente novo na biblioteca central, nunca uma gambiarra local com `className`.
- **Paleta minimalista**: branco, cinzas neutros sem matiz, um verde de marca (`#006B4F`) como única cor "quente".
- **Regra de hierarquia visual forte**: só duas coisas são preenchidas — `primary` (a ação que você quer que aconteça) e `destructive` (a que não pode ser desfeita). Todo o resto (secundário, contorno, fantasma) é chip claro em modo claro / escuro em modo escuro, nunca preenchido.
- **Paridade de tema**: `--primary`/`--destructive` têm o mesmo valor em claro e escuro. Única exceção: `--ring` clareia no modo escuro para manter contraste visível.
- **Escala de raio de borda padronizada**: `sm` 4px (controles menores) → `md` 5px (botões/inputs) → `lg` 8px (superfícies que contêm controles) → `none` só para elementos que devem se unir sem espaço.

## Onde isso diverge do que já temos

Comparado com `design-tokens.json` + `components/ui/`:

1. **`Button.tsx` viola a regra de hierarquia deles**: hoje temos `primary`, `secondary`, `danger` todos preenchidos, e só `ghost` é transparente. Pela regra deles, `secondary` deveria ser um chip/contorno, não preenchido — deixaria `primary`/`danger` se destacarem de verdade.
2. **Zero suporte a dark mode**: nossa paleta é única, sem tokens por tema. Mudança estrutural, não pontual — melhor tratar como tarefa própria se/quando for priorizada.
3. **A regra "fonte única, nunca sobrescrever com `className`" nunca foi documentada aqui** — na prática, os subagentes de Frontend das últimas fases estilizaram com Tailwind solto em vários componentes novos (`components/pipeline/*`, `components/agent/*`, etc.) em vez de sempre estender `components/ui/*`. Não é um erro deles — é a ausência de uma regra escrita que os briefings de subagentes pudessem apontar.
4. Escala de raio (`sm`/`md`/`lg` nossos: 2px/4px/8px) é parecida mas não idêntica à deles (4px/5px/8px) — diferença cosmética, não crítica.

## Recomendação para quando isso for implementado

- Prioridade alta, esforço baixo: mudar `Button.tsx` variant `secondary` para chip/contorno em vez de preenchido. **Feito** (já estava assim antes desta rodada).
- Prioridade média, esforço baixo: adicionar a regra "não sobrescrever com `className` solto — estender `components/ui/*`" nos briefings de subagentes de Frontend (ex: neste próprio arquivo, ou num `design/CONVENTIONS.md` dedicado). Ainda pendente.
- Prioridade baixa, esforço alto: dark mode completo — só vale a pena se/quando o portal do cliente ganhar prioridade de polimento visual. Ainda pendente.

## Redesign "Apple Design" — fundamentos (2026-08-13)

Usuário achou o visual "amador" e pediu pra aplicar os princípios da skill `apple-design` (motion fluido, materiais, tipografia óptica — ver *Designing Fluid Interfaces*, WWDC 2018). Escopo escolhido: **fundamentos primeiro** (tokens + primitivos compartilhados), não uma reescrita de cada página.

**Achados que motivaram isso**: a fonte de marca (Inter) nunca carregava de fato (`app/layout.tsx` não tinha `next/font` nem `<link>` — tudo caía no fallback do sistema); zero lib de motion instalada; nenhum componente tinha feedback de toque (`:active`); nenhum uso de `backdrop-filter`/material; raio de borda conservador (4/5/8px); tipografia sem tracking/leading por tamanho.

**O que mudou:**
- `app/layout.tsx`: `next/font/google` carrega a Inter de verdade agora, expõe `--font-inter`.
- `design-tokens.json`: `typography.sizes` virou tupla `[size, {lineHeight, letterSpacing}]` por tamanho (tracking negativo em texto grande, positivo em texto pequeno, leading inverso ao tamanho — skill seção 15); `radius` mais generoso (`sm` 6px → `xl` 22px); `shadows` mais suaves e com blur maior (hierarquia de elevação mais próxima de material real).
- Instalado `motion` (sucessor do framer-motion) — `npm install motion`.
- `components/ui/Button.tsx`: `active:scale-[0.97]` — feedback no press, não só no hover (skill seção 1, "Response").
- `components/ui/Card.tsx`: quando `interactive`, levanta (`-translate-y-0.5`) + sombra no hover, comprime no press.
- `components/ui/Input.tsx`: transição suave de borda/anel no foco.
- `components/layout/Sidebar.tsx`: indicador do item ativo usa `layoutId` compartilhado (`motion/react`) — ao trocar de página, o "pill" verde **morfa** de um item pro outro em vez de sumir/reaparecer; expansão de grupo anima altura via `AnimatePresence` em vez de show/hide instantâneo; sidebar ganhou `bg-white/90 backdrop-blur-xl` (material, não branco chapado).

**Fast-follow ainda não feito** (fora do escopo desta rodada, mencionar se o usuário quiser continuar):
- Componente `Modal`/`Sheet` compartilhado — hoje cada formulário (`ClientForm`, `ProspectForm`, `UtmLinkForm`...) reimplementa `fixed inset-0 bg-black/40` do zero, sem entrada/saída animada nem origem no elemento que disparou (skill seção 7, "spatial consistency").
- `StatusBadge`/`ClientStatusBadge`/`StageBadge` não foram tocados — visual ok, mas sem o mesmo polimento de transição.
- `prefers-reduced-motion` ainda não tratado nos componentes com spring novos (Sidebar) — skill seção 14.
- Rollout do redesign pras páginas em si (dashboard, kanban, pipeline, etc.) — os primitivos compartilhados já refletem automaticamente em todo lugar que os usa, mas nenhuma página individual foi redesenhada especificamente.
