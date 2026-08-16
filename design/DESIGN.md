# Design System — Plataforma Agência

Fonte da verdade visual do produto. Todo componente novo, toda página nova, segue isso — sem exceção, sem cor/espaçamento/sombra inventados fora daqui.

Status: v1 definido em 2026-08-12, **atualizado pra v2 em 2026-08-13** a partir de duas referências visuais que o usuário trouxe (Kelp CRM — Notification Center; Untitled UI — Upgrade to PRO). Substitui e formaliza `design/design-system-notes.md` (mantido como changelog de decisões). Plano de aplicação: `design/IMPLEMENTATION_PLAN.md`, Fase F em diante.

**O que a v2 muda de fato**: reforça a regra de elevação por borda (seção 4) — as referências confirmam "sem blur decorativo" (seção 9), então a tentativa de `backdrop-blur` na Sidebar da rodada anterior foi **revertida**, não mantida. Raio de borda um pouco mais generoso (seção 5). Títulos de página ganham peso/tamanho maior de verdade — hoje `3xl` estava "reservado, não usar" e nunca foi usado (seção 2). Três padrões de componente novos, direto das referências (seção 10): tabs com indicador animado, lista com badge de contagem + barra de destaque, e card de atividade com corpo rico (título bold + texto com palavras-chave em negrito/cor + timestamp).

## 0. Princípios (por que este sistema, não outro)

1. **Hierarquia por preenchimento, não por cor.** Só duas ações são preenchidas: `primary` (o que você quer que aconteça) e `danger` (o que não pode ser desfeito). Tudo mais — secundário, contorno, fantasma — é sóbrio. Isso é o que separa um software premium de um protótipo: o olho do usuário não compete entre 5 botões coloridos, ele sabe exatamente qual é a ação certa. (Herdado da análise do trycompai/crm, `design/design-system-notes.md`.)
2. **Neutro é a base, cor é exceção.** A interface é 90% cinza/branco; verde musgo aparece só onde importa (ação primária, foco, links, indicadores de marca). Software premium não grita — ele sussurra e deixa o conteúdo do usuário (as peças, os dados) ser o protagonista visual.
3. **Densidade de informação alta, ruído visual baixo.** É uma ferramenta de trabalho (agência gerenciando múltiplos clientes), não uma landing page. Prioriza escaneabilidade: tabelas/listas compactas, tipografia com hierarquia clara, espaçamento consistente — não espaço em branco decorativo.
4. **Todo estado é desenhado, não esquecido.** Vazio, carregando, erro, sucesso, hover, foco, desabilitado — nenhum componente vai pro código sem esses 7 estados pensados. É a diferença mais visível entre "parece uma demo" e "parece profissional".
5. **Acessível por padrão, não por auditoria depois.** Contraste AA, foco visível, alvo de toque ≥ 40px, nunca cor como único indicador de estado.

## 1. Cor

### 1.1 Marca — verde musgo

```
primary-50   #f3f6ee   fundo de destaque muito sutil (ex: linha selecionada)
primary-100  #e2ead4   fundo de badge/chip ativo
primary-300  #a8c07f   ícones/acentos secundários, bordas de foco em fundo escuro
primary-500  #6b8f4a   texto sobre fundo claro quando precisa de mais peso que 600
primary-600  #54733a   AÇÃO PRIMÁRIA (bg de botão, link ativo, indicador de seleção)
primary-700  #43602e   hover/active de primary-600
```

Contraste `primary-600` (#54733a) sobre branco: **5.1:1** — passa AA para texto normal e grande. Texto branco sobre `primary-600`: **6.4:1** — passa AA para qualquer tamanho.

### 1.2 Neutro — a base de 90% da interface

```
neutral-50   #f8fafc   fundo de página
neutral-100  #f1f5f9   fundo de card hover, fundo de input desabilitado
neutral-200  #e2e8f0   bordas (cards, inputs, divisores)
neutral-300  #cbd5e1   bordas de botão secundário, ícones inativos
neutral-500  #64748b   texto secundário, placeholder
neutral-700  #334155   texto padrão de corpo
neutral-900  #0f172a   títulos, texto de alto contraste
```

### 1.3 Semântico — status, nunca decorativo

Cada cor de status carrega significado fixo em todo o produto — a mesma cor sempre quer dizer a mesma coisa, em badge, gráfico ou texto:

```
draft               #94a3b8  neutro — ainda não começou
in_review            #3b82f6  azul — aguardando ação humana
changes_requested    #f59e0b  âmbar — precisa de atenção
approved             #10b981  verde — aprovado (nota: diferente do primary/marca de propósito, pra não confundir "aprovado" com "ação primária")
scheduled            #6366f1  índigo — programado, no futuro
published            #0d9488  teal — publicado, terminado
error                #ef4444  vermelho — mesma cor do botão danger
warning              #f59e0b
success              #10b981
info                 #3b82f6
```

### 1.4 Regra de uso (a parte que evita "AI slop")

- **Nunca gradiente.** Nenhum botão, card ou hero tem gradiente. É o primeiro sinal de interface genérica gerada por IA.
- **Nunca mais de uma cor de marca por tela como preenchimento.** Se dois elementos "importantes" competem, um deles não é primary — vira secondary.
- **Cor de status só em badge/indicador**, nunca como fundo de card inteiro ou de botão de ação.

## 2. Tipografia

Mantém Inter (já em uso, boa escolha — legibilidade alta em densidade de dados, sem trocar por capricho).

```
xs    12px / 18px, tracking +0.01em  — metadados, timestamps, legendas de gráfico
sm    14px / 21px, tracking 0        — corpo padrão de UI (labels, texto de tabela, botões)
base  16px / 26px, tracking 0        — corpo de leitura (comentários, descrições longas)
lg    18px / 27px, tracking -0.005em — subtítulo de card, título de seção pequena
xl    20px / 28px, tracking -0.01em  — título de card/painel em destaque
2xl   24px / 31px, tracking -0.015em — reservado, raro
3xl   30px / 36px, tracking -0.02em  — TÍTULO DE PÁGINA (h1) — ver nota abaixo
```

Pesos: `regular` (400) corpo, `medium` (500) labels/botões, `semibold` (600) títulos de card/seção, `bold` (700) h1 de página.

**Atualização v2 (2026-08-13)**: as duas referências trazidas pelo usuário usam h1 grande e bold de verdade ("Notification Center", "Upgrade to PRO") — bem mais confiante que o `xl 20px` que estávamos usando pros títulos de página até aqui. `3xl` deixa de ser "reservado" e vira o tamanho padrão de `<h1>` de página (`text-3xl font-bold tracking-[-0.02em]`), com tracking negativo pra compensar o tamanho maior (letras muito grandes "parecem" mais espaçadas do que são — skill apple-design, seção 15). `xl`/`2xl` seguem pra títulos de card/painel, não de página inteira.

**Regra de hierarquia**: numa mesma tela, no máximo 3 pesos/tamanhos diferentes de texto visíveis ao mesmo tempo. Mais que isso é ruído.

## 3. Espaçamento

Grid de 4px, já em uso — mantém. Regra prática:

- `1`-`2` (4-8px): entre elementos muito relacionados (ícone + label)
- `3`-`4` (12-16px): padding interno de componentes (card, input, botão)
- `6` (24px): entre blocos dentro de uma seção
- `8`-`12` (32-48px): entre seções de uma página

## 4. Elevação (sombra)

```
sm  0 1px 2px 0 rgb(15 23 42 / 0.04)   — quase invisível; card interativo em hover
md  0 8px 24px -8px rgb(15 23 42 / 0.12) — dropdown, popover
lg  0 16px 40px -12px rgb(15 23 42 / 0.18) — modal, sheet
```

**Atualização v2 (2026-08-13)**: as referências confirmam a regra original — elas quase não usam sombra. Superfícies em repouso (`Card` padrão, `Sidebar`, painéis) se separam do fundo por **borda de 1px** (`border-neutral-200`), não por sombra. Sombra só aparece em três casos: card interativo no hover, e qualquer coisa que "flutua" sobre o conteúdo (dropdown, popover, modal/sheet). Um `Card` estático não tem `shadow-sm` nem no repouso — só a borda.

## 5. Raio de borda

```
none  0px    — elementos que se unem sem espaço (tabs, segmented control)
sm    6px    — controles pequenos (badge, chip, input compacto)
md    10px   — botões, inputs, campos de formulário (padrão)
lg    18px   — cards, modais, superfícies que contêm outros controles
xl    22px   — painéis grandes, containers de página, elementos hero
full  9999px — avatar, badge pill, indicador circular
```

(v2, 2026-08-13: escala mais generosa que a v1 — `sm:4px/md:5px/lg:8px` — pra bater com o acabamento "continuo/macio" das duas referências, onde cards e painéis têm raio bem mais visível que botões/inputs.)

## 6. Movimento

Nada de animação gratuita. Regras:

- Transições de cor/opacidade: `150ms ease` (hover, foco) — já em uso via `transition-colors`.
- Toda superfície que responde a toque (`Button`, `Card interactive`) tem feedback no **press**, não só no hover — `active:scale-[0.97]`, já aplicado.
- Nunca anima entrada de página inteira, nunca "scroll reveal". Isso é decoração de marketing site, não de ferramenta de trabalho.
- Loading: skeleton ou texto "Carregando...", nunca spinner infinito sem contexto do que está carregando.

**Atualização v2 (2026-08-13)**: lib `motion` instalada (`npm install motion`) especificamente pra dois casos onde CSS puro não dá conta — indicador que precisa **morfar** de uma posição pra outra (não é um fade, é o mesmo elemento visual se movendo), e altura que precisa animar de/para `auto` (expandir/colapsar). Uso restrito a esses dois casos, com spring `{ stiffness: 500, damping: 35 }` (crítico, sem bounce — skill apple-design, seção 4, "damping 1.0 por padrão"): indicador de item ativo da Sidebar (`layoutId` compartilhado) e indicador de tab ativa (seção 10). Não usar `motion` pra fade/hover simples — isso continua sendo CSS `transition`.

## 7. Componentes — estado por estado

Todo componente interativo precisa cobrir, no mínimo:

| Estado | Regra |
|---|---|
| Padrão | conforme variante (seção 1.4) |
| Hover | escurece 1 degrau (`600`→`700`) ou `bg-neutral-50/100` para contornos |
| Foco (teclado) | anel visível `ring-2 ring-primary-500 ring-offset-1` — nunca `outline: none` sem substituto |
| Desabilitado | `opacity-50`, `cursor-not-allowed`, nunca só "meio apagado" sem indicar que não é clicável |
| Carregando | texto do botão muda ("Salvando...") + disabled — já é o padrão usado em várias telas, manter |
| Vazio (listas) | mensagem específica do contexto + ação sugerida, nunca só "Nenhum item" genérico — já bem feito em várias telas (Pipeline, Links), replicar esse padrão sempre |
| Erro | `text-status-error`, mensagem específica da causa (nunca "Erro desconhecido" se a API deu detalhe) |

## 8. Acessibilidade — não negociável

- Contraste mínimo AA (4.5:1 texto normal, 3:1 texto grande/ícones) — todos os tokens acima já validados.
- Todo input tem `<label>` associado (já é o padrão no código — manter).
- Foco por teclado sempre visível — auditar componentes que usam `focus:outline-none` sem `focus:ring` (ver Input.tsx, já correto).
- Alvo de toque mínimo 40x40px em botões/links de ação (checar botões pequenos tipo "Marcar como resolvido" em mobile).
- Nunca cor sozinha para indicar status — sempre cor + texto/ícone (badges já seguem isso corretamente).

## 9. O que isto explicitamente não é

Pra evitar "AI slop" (ver módulo de detecção da skill de design system):

- Sem glassmorphism, sem blur decorativo. **(v2: a Sidebar ganhou `backdrop-blur-xl` numa rodada anterior, sem referência nenhuma pedindo isso — revertido. As duas referências trazidas confirmam que a regra original estava certa: nenhuma delas usa blur em superfície nenhuma.)**
- Sem cards com borda arco-íris ou gradiente de borda.
- Sem ilustração 3D genérica de hero. Ícone de app com gradiente/glossy (como o da referência Kelp) também entra aqui — usar ícone plano com fundo de cor sólida em vez disso.
- Sem confetti/celebração animada em ações de sucesso — um toast discreto basta.
- Sem fonte serifada "premium" forçada — Inter com hierarquia correta já comunica qualidade.

## 10. Padrões de componente — v2, direto das referências (2026-08-13)

Três padrões que as referências trazem e que não existiam no v1. Cada um vira um primitivo em `components/ui/` (Fase G do plano) antes de ser usado em qualquer página — nunca replicar o markup solto por tela (mesma regra da seção 0, princípio 1).

### 10.1 Tabs com indicador animado
Referência: linha "Show all · Conversions · Leads activity · New leads" (Kelp). Aba ativa = texto na cor de marca + barra fina embaixo; trocar de aba faz a barra **morfar** pra nova posição (`layoutId` compartilhado, mesmo padrão já usado no indicador ativo da Sidebar) em vez de sumir/reaparecer. Cada aba pode levar um badge de contagem (`8`, `2`, `4`) — mesmo componente `CountBadge` da seção 10.2.

### 10.2 Lista com contagem + indicador de seleção
Referência: lista "Team · Leads · Kelp Ai · Emails..." (Kelp). Item de lista = ícone + label + `CountBadge` (pill cinza claro, número) alinhado à direita. Item selecionado: fundo `primary-50`, texto `primary-700`, **barra vertical de 2-3px na cor de marca colada na borda esquerda** (não só mudança de fundo — reforça a seleção mesmo pra quem tem dificuldade de perceber contraste de cor).

### 10.3 Card de atividade com corpo rico
Referência: cards "Role Change" (Kelp) — título bold + timestamp relativo no canto (`2 hours ago`) + corpo em cinza com palavras-chave específicas em negrito/cor (`Courtney Henry role was changed from **Lead** to **Buyer**`) + avatar/chip mostrando a transição (`L → B`). Aplicação direta no produto: `ActivitiesLog.tsx` e o feed de atividade recente do `agency-dashboard` (seção 1.2 de `INFORMATION_ARCHITECTURE.md`) hoje só mostram uma linha de texto plano — esse padrão é uma evolução natural do mesmo componente, não uma tela nova.

### 10.4 Fora de escopo por enquanto
Card selecionável tipo rádio (Untitled UI, seletor de ciclo de cobrança) e input stepper (`- 2 +`) são padrões bonitos mas não têm um uso concreto no produto hoje (não temos billing nem contadores de quantidade) — documentados aqui pra não esquecer, mas não entram no plano de implementação até aparecer um caso de uso real.
