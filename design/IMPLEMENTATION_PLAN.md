# Plano de implementação — Design System v1

Referência: `design/DESIGN.md`. Este plano existe pra aplicar o sistema em código já existente sem quebrar nada e sem virar um projeto infinito.

## Fase A — Primitivos (fundação, tudo depende disso)

Escopo: só `components/ui/*` (Button, Card, Input, Badge). Nenhuma página é tocada.

- [x] `design-tokens.json`: cor de marca → verde musgo, raio de borda → escala v1 (feito em 2026-08-12)
- [x] `Button.tsx`: hierarquia primary/danger preenchidos, secondary vira contorno (feito em 2026-08-12)
- [ ] `Button.tsx`: adicionar anel de foco visível (`focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1`) — hoje não tem nenhum estado de foco por teclado
- [ ] `Input.tsx`: mesmo anel de foco no padrão do Button (hoje usa `focus:ring-1`, ajustar pra `focus-visible` e alinhar cor/offset)
- [ ] `Card.tsx`: variante `interactive` (hover sobe pra `shadow-md` + `cursor-pointer`) vs. `static` (fica só `shadow-sm`) — hoje todo Card tem a mesma sombra fixa, mesmo os que não são clicáveis
- [ ] `Badge.tsx`: já segue bem o sistema (cor + texto, nunca só cor) — sem mudança necessária, só confirmar que `LinkStatusBadge`/`StageBadge` seguem o mesmo padrão de contraste

Critério de pronto: `npm run build` limpo, e uma checagem visual rápida de `/kanban` (única tela que já usa todos os primitivos) confirmando que nada quebrou.

## Fase B — Varredura de consistência nas páginas existentes

Escopo: toda página construída nas Fases 0-5 (Kanban, Pipeline, Links, Insights, Aprovações, Login). Objetivo: achar onde um subagente anterior "inventou" uma cor/espaçamento fora do sistema em vez de reusar os primitivos.

Já sabemos de um caso concreto pela auditoria anterior (`design/design-system-notes.md`, item 3): vários componentes novos (`components/pipeline/*`, `components/agent/*`) usam Tailwind solto em vez de sempre passar pelos primitivos. Fase B é resolver isso.

- [ ] Grep por classes de cor hardcoded fora dos tokens (`bg-blue-`, `bg-purple-`, `text-gray-` — cores do Tailwind puro, não dos tokens `primary-`/`neutral-`/`status-`) em `components/` e `app/`
- [ ] Para cada ocorrência: trocar pela variante correta do primitivo, ou — se for um caso legítimo novo — adicionar ao design system em vez de deixar solto
- [ ] Conferir que todo botão de "ação primária" numa tela usa `variant="primary"` e não um `<button>` cru com className manual (ex: conferir `ConvertToClientButton`, `CopyLinkButton`, os botões dentro de `UtmLinkForm`)

## Fase C — Estados vazios/erro/carregando (auditoria de completude)

A maioria das telas já faz isso bem (Pipeline, Links, Insights têm empty states bons). Fase C é achar as exceções:

- [ ] `/dashboard` do cliente é um `<h1>` estático — não tem estado real nenhum ainda (é a página mais "vazia" do produto hoje, literalmente)
- [ ] Conferir se toda mutação (`useMutation`) tem tratamento de erro visível pro usuário, não só `console.error`
- [ ] Conferir foco por teclado em todos os formulários modais (`UtmLinkForm`, `ProspectForm`) — modal deveria capturar foco ao abrir e devolver ao fechar (hoje provavelmente não faz isso)

## Fase D — Acessibilidade (auditoria dedicada)

- [ ] Rodar Lighthouse/axe (via Chrome DevTools MCP, já disponível) nas páginas principais e corrigir o que aparecer
- [ ] Confirmar contraste em `StatusBadge`/`StageBadge` (algumas cores de status, como `#f59e0b` sobre branco, podem não passar AA pra texto pequeno — validar com ferramenta, não só olho)
- [ ] Alvos de toque < 40px (candidatos: botões pequenos "Marcar como resolvido", ícones de ação em tabelas)

## Fase E — Dark mode (opcional, só se priorizado)

Não entra no MVP do design system a menos que você peça — é a mudança mais estrutural (token por tema, `--ring` com paridade) e o portal ainda não tem uso real o suficiente pra justificar o esforço agora.

## Como isso vai ser executado

Mesmo modelo das fases de produto: um subagente de Frontend por fase (B, C, D são independentes entre si depois que A terminar), cada um revisado antes do merge, `type-check`/`lint`/`build` como critério de pronto. A Fase A eu já apliquei direto (é pequena e fundacional, não precisava de subagente).

**Não vou disparar B/C/D automaticamente** — cada uma é um caso de "vale a pena agora?" separado. Fase B é a mais valiosa (consistência visível em toda a produto); D é importante mas menos urgente num app ainda não público; E é a que eu mais adiaria.

---

## Fase F — Fundamentos v2 (referências visuais, 2026-08-13)

Motivada pelo usuário achando o resultado da Fase A "amador" e trazendo duas referências (Kelp CRM, Untitled UI). Ver `design/DESIGN.md` v2 pro racional completo de cada mudança. Escopo: só tokens + `components/ui/*` + `Sidebar.tsx` — nenhuma página nova é tocada, mesma lógica da Fase A.

- [x] `app/layout.tsx`: `next/font/google` carregando Inter de verdade (bug real — nunca carregava antes)
- [x] `motion` instalado
- [x] `Button.tsx`: `active:scale-[0.97]` no press
- [x] `Card.tsx`: eleva no hover/comprime no press quando `interactive` — **pendente**: remover `shadow-sm` do estado de repouso (v2 do `DESIGN.md` §4 diz card estático não tem sombra nenhuma, só borda; a Fase A anterior manteve `shadow-sm` sempre)
- [x] `Input.tsx`: transição suave no foco
- [x] `Sidebar.tsx`: indicador ativo com `layoutId` (morphing), grupo expande com `AnimatePresence`
- [ ] `Sidebar.tsx`: **reverter** `bg-white/90 backdrop-blur-xl` → `bg-white` sólido (nenhuma referência usa blur; `DESIGN.md` §9 já proibia isso antes da Fase A introduzir)
- [ ] `Sidebar.tsx`: indicador de item ativo ganha a barra vertical de 2-3px na borda esquerda (`DESIGN.md` §10.2), além do fundo tintado que já existe
- [ ] `design-tokens.json` → `tailwind.config.ts`: aplicar raio v2 (`lg` 8px→18px, `xl` 16px→22px, `md`/`sm` já ajustados na Fase A) e sombra v2 (`md`/`lg` mais suaves, já ajustadas; `sm` quase invisível, já ajustada) — **conferir se precisa de mais um ajuste fino** depois de ver as páginas reais com o raio novo
- [ ] `<h1>` de página: trocar `text-xl font-semibold` → `text-3xl font-bold tracking-[-0.02em]` nas páginas que usam esse padrão (grep por `text-xl font-semibold` em `app/**/*.tsx` pra achar todas de uma vez)

Critério de pronto: `npm run build` limpo, checagem visual de pelo menos duas telas (`/agency-dashboard`, `/clients`) confirmando raio/sombra/tipografia novos sem quebrar layout.

## Fase G — Novos primitivos compartilhados

Componentes que as referências trazem e que não existem hoje (`DESIGN.md` §10.1-10.2):

- [ ] `components/ui/Tabs.tsx`: tabs com indicador de linha animado (`layoutId`, mesmo spring da Sidebar) + badge de contagem opcional por aba
- [ ] `components/ui/CountBadge.tsx`: pill cinza claro com número — hoje cada tela que precisa disso (se precisar) reinventaria do zero; vira o padrão único
- [ ] Refinar item de lista selecionável (usado hoje em `ClientsBoard`, `ActivitiesLog`) pra ganhar a barra de destaque na borda esquerda quando ativo

## Fase H — Rollout pros padrões de conteúdo real

- [ ] `ActivitiesLog.tsx` (seção 2.3 de `INFORMATION_ARCHITECTURE.md`) e o feed de atividade recente do `agency-dashboard` (seção 1.2): evoluir pro padrão de card rico (`DESIGN.md` §10.3) — título bold + timestamp no canto + corpo com palavras-chave em negrito/cor, em vez da linha de texto plano atual
- [ ] Páginas com abas reais (nenhuma hoje usa tabs — `ClientsBoard` usa botões de filtro por status; avaliar se vale trocar por `Tabs.tsx` da Fase G, ou se o padrão de filtro por chip já é suficiente ali)
- [ ] Varredura geral: qualquer `Card` estático que hoje depende do `shadow-sm` antigo pra se destacar do fundo — conferir que a borda sozinha (Fase F) ainda separa visualmente bem, ajustar `border-neutral-200` → mais escura se precisar de mais contraste

Não vou disparar F/G/H automaticamente — mesmo modelo das fases anteriores, uma pergunta de escopo por fase antes de começar.
