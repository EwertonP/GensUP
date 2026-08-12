# Notas de design system — aprendizados do Comp AI CRM (trycompai/crm)

Status: análise registrada, **nenhuma mudança de código aplicada ainda** (decisão do usuário em 2026-08-11: documentar agora, implementar depois).

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

- Prioridade alta, esforço baixo: mudar `Button.tsx` variant `secondary` para chip/contorno em vez de preenchido.
- Prioridade média, esforço baixo: adicionar a regra "não sobrescrever com `className` solto — estender `components/ui/*`" nos briefings de subagentes de Frontend (ex: neste próprio arquivo, ou num `design/CONVENTIONS.md` dedicado).
- Prioridade baixa, esforço alto: dark mode completo — só vale a pena se/quando o portal do cliente ganhar prioridade de polimento visual.
