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
