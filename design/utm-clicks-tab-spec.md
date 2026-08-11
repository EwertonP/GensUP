# Spec — Aba de Cliques (UTM) no Dashboard de Insights

Status: pronto para implementação
Local: `app/(client-portal)/insights/page.tsx` — nova seção ao lado das métricas orgânicas existentes (não é uma rota nova)
Consome: `GET /api/utm-links/clicks` → `[{ date: string, count: number }]` (cliques agregados por dia, últimos 30 dias) + endpoint equivalente por link (ver seção 3, a confirmar com Backend se já existe)

Reaproveita os mesmos primitivos e convenções de `components/insights/InsightsDashboard.tsx`:
- `Card` como container de cada bloco
- SVG simples desenhado à mão (sem lib de gráfico nova — o projeto já evita isso deliberadamente, ver comentário "sem lib de chart, conforme padrão atual do projeto" em `MetricLineChart`)
- `Intl.NumberFormat("pt-BR")` para números, `toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })` para datas
- `text-neutral-*` para hierarquia de texto secundário, `tabular-nums` para números em coluna

---

## 1. Onde entra na página

`insights/page.tsx` hoje renderiza, para cada conta social conectada, um bloco com título da plataforma + `<InsightsDashboard>`. A aba de cliques UTM é **independente de conta social** (links UTM pertencem ao cliente, não a uma plataforma específica), então ela não entra dentro do loop de `accounts.map(...)`.

Adicionar uma nova seção no nível da página, abaixo do `<h1>Insights</h1>` e acima (ou abaixo — sugestão: abaixo) do loop de contas sociais:

```tsx
<h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Cliques em links (UTM)</h2>
<UtmClicksPanel /* client component */ />
```

Isso mantém a mesma hierarquia visual já usada dentro de `InsightsDashboard` (o `<h2>` "Métricas" usa exatamente essa classe) — a nova seção passa a se ler como mais uma "aba"/bloco de métricas dentro da mesma página, sem precisar de um sistema de tabs novo. Se o time preferir tabs de verdade (Instagram | Cliques), isso é aceitável, mas **não é necessário para o MVP** — duas seções empilhadas na mesma página já comunicam a separação.

Componente novo: `components/insights/UtmClicksPanel.tsx` (Client Component, `"use client"`, mesmo padrão de data-fetching com `@tanstack/react-query` usado em `InsightsDashboard`).

---

## 2. Gráfico de cliques agregados por dia (últimos 30 dias)

### 2.1 Estrutura

Um único `Card` no topo da seção, largura cheia (ou `sm:grid-cols-2` ao lado de outro card de resumo — ver 2.3), contendo um gráfico de barras simples em SVG (não linha — cliques por dia se lêem melhor como barras do que como série contínua, e ainda assim é tão simples quanto o `polyline` já usado).

```tsx
function ClicksBarChart({ points }: { points: { date: string; count: number }[] }) {
  const width = 640;
  const height = 120;
  const paddingX = 8;
  const paddingY = 12;
  const barGap = 2;

  const max = Math.max(...points.map((p) => p.count), 1);
  const barWidth = (width - paddingX * 2) / points.length - barGap;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full" role="img" aria-label="Cliques por dia nos últimos 30 dias">
      {points.map((p, i) => {
        const barHeight = (p.count / max) * (height - paddingY * 2);
        const x = paddingX + i * (barWidth + barGap);
        const y = height - paddingY - barHeight;
        return (
          <rect key={p.date} x={x} y={y} width={barWidth} height={barHeight} fill="#2563eb" rx={1} />
        );
      })}
    </svg>
  );
}
```

Cor da barra: mesma `#2563eb` (azul) já usada no `stroke`/`fill` de `MetricLineChart` — manter consistência de paleta entre os dois gráficos da mesma página.

Abaixo do SVG, mesmo padrão de `MetricLineChart`: uma linha com a data mais antiga à esquerda e a mais recente à direita (`text-[11px] text-neutral-400`, `flex justify-between`).

Título do card: `<h3 className="text-sm font-medium text-neutral-700">Cliques por dia</h3>` — mesma classe usada em `MetricLineChart` para o título de cada métrica.

### 2.2 Tooltip / valor ao passar o mouse (opcional para o MVP)

Não obrigatório. Se o Frontend quiser, pode adicionar `<title>{count} cliques em {data}</title>` dentro de cada `<rect>` — é nativo do SVG, sem JS adicional, e dá um tooltip básico no hover. Recomendado por ser praticamente grátis, mas não é bloqueante.

### 2.3 Resumo numérico ao lado (opcional, recomendado)

Se houver espaço, um segundo `Card` pequeno ao lado do gráfico (grid `sm:grid-cols-[2fr_1fr]` ou empilhado abaixo em telas estreitas) com o total do período, no mesmo estilo dos cards de métrica atual (`latestByMetric.map` em `InsightsDashboard`):

```tsx
<Card className="flex flex-col gap-1 p-4">
  <span className="text-xs text-neutral-500">Total de cliques (30 dias)</span>
  <span className="text-2xl font-semibold text-neutral-900" style={{ fontVariantNumeric: "tabular-nums" }}>
    {formatValue(total)}
  </span>
</Card>
```

---

## 3. Cliques por link individual

Abaixo do gráfico agregado, uma tabela simples (mesmo padrão de `Card` + `<table>` sugerido na spec de gestão de links, `design/utm-link-management-spec.md`, seção 2.2):

Colunas:
| Coluna | Conteúdo |
|---|---|
| Link | título do link (`title`) + slug abaixo em cinza pequeno, ou só o título se espaço for curto |
| Cliques (30 dias) | contagem total no período, alinhado à direita, `tabular-nums` |

Ordenar por cliques decrescente (o link mais clicado primeiro) — é a informação mais útil para o cliente/agência de imediato.

Se a lista for longa (mais de ~8 links), limitar a exibição aos top 8 com um link/texto "Ver todos os links" que leva para a tela de gestão de links (`/links`, se o cliente tiver acesso) — ou, se o portal do cliente não tem acesso a essa tela, simplesmente mostrar todos sem paginação nesta v1 (o volume de links por cliente tende a ser pequeno no MVP).

Nota para o Backend/Frontend: esta spec assume que `GET /api/utm-links/clicks` cobre apenas o agregado por dia (conforme enunciado da tarefa). Para a tabela por link, é necessário um retorno equivalente por `link_id` (ex.: `[{ link_id, title, slug, count }]`) — **confirmar se esse endpoint já existe ou se precisa ser adicionado** antes do Frontend implementar esta seção. Se não existir ainda, a seção 3 pode ficar como "Em breve" no MVP inicial enquanto o endpoint é criado, sem bloquear a entrega do gráfico agregado (seção 2).

---

## 4. Estado vazio

Quando não houver nenhum clique registrado no período (array vazio ou todos os `count` zerados), substituir tanto o gráfico quanto a tabela por um único bloco de estado vazio, no mesmo tom usado em `InsightsDashboard.tsx` para "Nenhuma métrica sincronizada ainda":

```tsx
<p className="text-sm text-neutral-500">
  Nenhum clique registrado ainda nos links UTM deste cliente. Assim que alguém clicar em um link
  rastreado, os dados aparecem aqui.
</p>
```

Não usar `Card` vazio decorativo nem ilustração — o projeto não usa esse tipo de estado vazio ilustrado em nenhum outro lugar (ver estado vazio de "nenhuma conta conectada" e "nenhuma métrica sincronizada", ambos são só parágrafo + ação quando aplicável). Manter consistência: aqui não há ação relevante para oferecer (não é a agência quem cria cliques), então é só o parágrafo, sem botão.

Caso o cliente não tenha nenhum link UTM criado ainda (diferente de "tem links mas zero cliques"), usar uma variação de copy:
```tsx
<p className="text-sm text-neutral-500">
  Nenhum link UTM criado para este cliente ainda. Fale com sua agência para criar links
  rastreáveis de campanha.
</p>
```
(Distinção entre "sem links" e "com links, sem cliques" depende de o endpoint retornar essa informação — se a API só retornar `[]` em ambos os casos sem diferenciar, usar a primeira mensagem genérica para os dois casos.)

---

## 5. Estados de carregamento e erro

Mesmo padrão de `InsightsDashboard`:
- Carregando: `<p className="text-sm text-neutral-400">Carregando cliques...</p>`
- Erro: `<p className="text-sm text-status-error">{mensagem de erro}</p>`, usando a mesma extração de erro (`err instanceof Error ? err.message : "Erro ao carregar cliques."`)

---

## 6. Copy de referência (pt-BR)

| Elemento | Texto |
|---|---|
| Título da seção | Cliques em links (UTM) |
| Título do gráfico | Cliques por dia |
| Total do período | Total de cliques (30 dias) |
| Coluna tabela | Link / Cliques (30 dias) |
| Ver mais | Ver todos os links |
| Carregando | Carregando cliques... |
| Vazio (sem cliques, com links) | Nenhum clique registrado ainda nos links UTM deste cliente. Assim que alguém clicar em um link rastreado, os dados aparecem aqui. |
| Vazio (sem links) | Nenhum link UTM criado para este cliente ainda. Fale com sua agência para criar links rastreáveis de campanha. |

---

## 7. Pontos para validação humana

1. **Endpoint de cliques por link** (`link_id` → contagem): confirmar se existe ou precisa ser criado pelo Backend antes do Frontend implementar a seção 3 desta spec.
2. **Diferenciação "sem links" vs. "com links, zero cliques"**: confirmar se a API expõe essa distinção ou se o estado vazio deve ser genérico.
3. **Tabs de verdade vs. seções empilhadas**: confirmar se o time prefere um componente de tabs (Instagram | Cliques UTM) em vez de duas seções na mesma página scrollável — a spec assume seções empilhadas por simplicidade e por não haver componente de Tabs no design system atual (`components/ui/`).
