# Design System — Plataforma Agência

Fonte da verdade visual do produto. Todo componente novo, toda página nova, segue isso — sem exceção, sem cor/espaçamento/sombra inventados fora daqui.

Status: v1, definido em 2026-08-12. Substitui e formaliza `design/design-system-notes.md` (mantido como changelog de decisões).

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
xs    12px / 16px  — metadados, timestamps, legendas de gráfico
sm    14px / 20px  — corpo padrão de UI (labels, texto de tabela, botões)
base  16px / 24px  — corpo de leitura (comentários, descrições longas)
lg    18px / 28px  — subtítulo de card, título de seção pequena
xl    20px / 28px  — título de página (h1 de portal)
2xl   24px / 32px  — título de destaque (raro — landing/onboarding)
3xl   30px / 36px  — reservado, não usar em telas de produto ainda
```

Pesos: `regular` (400) corpo, `medium` (500) labels/botões, `semibold` (600) títulos de card/seção, `bold` (700) só h1.

**Regra de hierarquia**: numa mesma tela, no máximo 3 pesos/tamanhos diferentes de texto visíveis ao mesmo tempo. Mais que isso é ruído.

## 3. Espaçamento

Grid de 4px, já em uso — mantém. Regra prática:

- `1`-`2` (4-8px): entre elementos muito relacionados (ícone + label)
- `3`-`4` (12-16px): padding interno de componentes (card, input, botão)
- `6` (24px): entre blocos dentro de uma seção
- `8`-`12` (32-48px): entre seções de uma página

## 4. Elevação (sombra)

```
sm  0 1px 2px 0 rgb(0 0 0 / 0.05)   — card padrão em repouso
md  0 4px 6px -1px rgb(0 0 0 / 0.1) — card em hover, dropdown
lg  0 10px 15px -3px rgb(0 0 0 / 0.1) — modal, popover
```

Regra: elevação sobe com interação (hover/aberto), nunca é estática decorativa. Um card que não é clicável não tem `shadow-md` — só `shadow-sm` ou nenhuma.

## 5. Raio de borda

```
none  0px    — elementos que se unem sem espaço (tabs, segmented control)
sm    4px    — controles pequenos (badge, chip, input compacto)
md    5px    — botões, inputs, campos de formulário (padrão)
lg    8px    — cards, modais, superfícies que contêm outros controles
xl    16px   — reservado para elementos grandes/hero, raro em produto
full  9999px — avatar, badge pill, indicador circular
```

(Ajustado de `sm:2px/md:4px` para `sm:4px/md:5px` — escala mais legível e alinhada ao padrão de referência.)

## 6. Movimento

Nada de animação gratuita. Regras:

- Transições de cor/opacidade: `150ms ease` (hover, foco) — já em uso via `transition-colors`.
- Nunca anima entrada de página inteira, nunca "scroll reveal". Isso é decoração de marketing site, não de ferramenta de trabalho.
- Loading: skeleton ou texto "Carregando...", nunca spinner infinito sem contexto do que está carregando.

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

- Sem glassmorphism, sem blur decorativo.
- Sem cards com borda arco-íris ou gradiente de borda.
- Sem ilustração 3D genérica de hero.
- Sem confetti/celebração animada em ações de sucesso — um toast discreto basta.
- Sem fonte serifada "premium" forçada — Inter com hierarquia correta já comunica qualidade.
