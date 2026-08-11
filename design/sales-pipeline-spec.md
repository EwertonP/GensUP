# Spec — Pipeline de Vendas (Portal da Agência)

Status: pronto para implementação
Rota sugerida: `app/(agency-portal)/pipeline/page.tsx` (+ `components/pipeline/` para os componentes de cliente)
Consome: `GET/POST /api/prospects`, `PATCH/DELETE /api/prospects/[id]`, `POST /api/prospects/[id]/convert` (endpoint de conversão em cliente, em construção pelo Backend)

Reaproveita os primitivos existentes — não criar nenhum estilo novo de botão, card, input ou badge:
- `components/ui/Card.tsx`
- `components/ui/Button.tsx` (variants `primary` / `secondary` / `danger` / `ghost`)
- `components/ui/Input.tsx`
- `components/ui/Badge.tsx` (union type fechado em `draft/in_review/.../published` — **não serve** para stage de prospect; criar um badge irmão, ver seção 2.3)

Referência visual estrutural: `components/kanban-board/KanbanBoard.tsx` (grid CSS de colunas fixas, sem drag-and-drop, cards simples em `bg-white shadow-sm`). O board de pipeline segue o mesmo esqueleto visual, com colunas e cards diferentes.

Convenções herdadas do restante do projeto: Server Component busca dados iniciais via Supabase (RLS cuida do escopo), Client Component (`"use client"`) cuida de mutações com `@tanstack/react-query`, textos em pt-BR, `Intl.NumberFormat("pt-BR")` para números, `toLocaleDateString("pt-BR")` para datas, paleta `neutral-*` para textos secundários.

---

## 1. Estrutura da página

```
app/(agency-portal)/pipeline/page.tsx         → Server Component: busca prospects + usuários (para "dono") e renderiza <PipelineBoard />
components/pipeline/PipelineBoard.tsx         → Client Component: estado da tela (board + modal de criação)
components/pipeline/PipelineColumn.tsx        → uma coluna do board
components/pipeline/ProspectCard.tsx          → card individual de prospect
components/pipeline/ProspectForm.tsx          → formulário de criação de prospect
components/pipeline/ConvertToClientButton.tsx → botão + fluxo de conversão em cliente
```

Título da página: `<h1 className="text-xl font-semibold">Pipeline de vendas</h1>`.

Subtítulo (`text-sm text-neutral-500`):
> "Acompanhe prospects do primeiro contato até o fechamento."

Botão de ação principal no canto superior direito do header: `<Button variant="primary">+ Novo prospect</Button>` — abre o formulário de criação (seção 4).

---

## 2. Board Kanban

### 2.1 Colunas

Cinco colunas fixas, nesta ordem, mapeando 1:1 para o enum `stage`:

| Coluna (label) | valor `stage` |
|---|---|
| Novo | `novo` |
| Contatado | `contatado` |
| Proposta | `proposta` |
| Fechado | `fechado` |
| Perdido | `perdido` |

Estrutura igual à de `KanbanBoard.tsx`: `grid grid-cols-5 gap-4` (em telas menores, `overflow-x-auto` com colunas de largura mínima `min-w-[220px]` para não quebrar o layout — o Kanban atual não trata isso, mas 5 colunas em vez de 6 já é mais apertado, então vale adicionar esse scroll horizontal).

Cada coluna:
```tsx
<div className="rounded-lg bg-neutral-100 p-3">
  <h3 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
    {label} <span className="text-neutral-400">({count})</span>
  </h3>
  <div className="flex flex-col gap-2">{/* cards */}</div>
</div>
```

O contador `({count})` ao lado do título da coluna é um adicional simples em relação ao `KanbanBoard` de conteúdo — útil aqui porque o volume de prospects por coluna importa para o vendedor (ex.: "tenho 12 em 'Contatado' e só 2 em 'Proposta'").

A coluna "Perdido" deve visualmente comunicar "fim de linha, sem ação esperada" — usar um tom mais apagado no header da coluna (`text-neutral-400` em vez de `text-neutral-500` já é suficiente, não precisa de cor extra).

### 2.2 Como mover um prospect entre colunas — decisão

**Decisão: dropdown de stage dentro do card, não drag-and-drop.**

Justificativa:
- Drag-and-drop exige uma lib nova (o projeto não tem nenhuma atualmente — `KanbanBoard.tsx` é propositalmente estático) ou uma implementação manual de HTML5 DnD, que é significativamente mais trabalho e superfície de bugs (acessibilidade, mobile, reordenação otimista) para um MVP.
- Um `<select>` de stage por card é imediato de implementar com o `Input`/select nativo já usado em outras specs (ver `utm-link-management-spec.md`, seção 3.3), funciona em mobile sem adaptação, e é acessível por teclado de graça.
- "Clique para avançar" (um botão único que move sempre para o próximo estágio) foi descartado porque o fluxo de vendas não é estritamente linear — um prospect pode voltar de "Proposta" para "Contatado", ou pular direto para "Perdido" a partir de qualquer estágio. Um dropdown com as 5 opções cobre isso sem ambiguidade; um botão "avançar" não cobre retrocesso nem "perdido" fora de sequência.

Implementação sugerida — select no rodapé do card:
```tsx
<select
  value={prospect.stage}
  onChange={(e) => updateStage(prospect.id, e.target.value)}
  className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
>
  <option value="novo">Novo</option>
  <option value="contatado">Contatado</option>
  <option value="proposta">Proposta</option>
  <option value="fechado">Fechado</option>
  <option value="perdido">Perdido</option>
</select>
```
Ao mudar, `PATCH /api/prospects/[id]` com `{ stage: novoValor }`, mutação otimista via react-query (mover o card visualmente antes da resposta, reverter em caso de erro) para não travar a UI a cada troca.

Se o Frontend preferir uma segunda v2 com drag-and-drop (ex. `@dnd-kit`), isso é aceitável como evolução futura — não bloqueia o MVP e não deve ser feito agora.

### 2.3 Card de prospect

```tsx
<Card className="flex flex-col gap-2 p-3 text-sm">
  <p className="font-medium text-neutral-900 truncate">{prospect.name}</p>
  <p className="text-xs text-neutral-500 truncate">{prospect.company}</p>

  <div className="flex flex-wrap items-center gap-1.5">
    <SourceBadge source={prospect.source} />
    <StaleIndicator updatedAt={prospect.stage_updated_at} />
  </div>

  <p className="text-xs text-neutral-400">Dono: {prospect.owner_name}</p>

  {/* select de stage, seção 2.2 */}

  {prospect.stage === "fechado" && <ConvertToClientButton prospectId={prospect.id} />}
</Card>
```

Campos exibidos, em ordem de prioridade visual:
1. **Nome** — `font-medium text-neutral-900`, truncado.
2. **Empresa** (`company`) — `text-xs text-neutral-500`, truncado.
3. **Origem** (`source`) — badge pequeno, ver abaixo.
4. **Indicador de tempo parado na coluna** — ver 2.4.
5. **Dono** (`owner_user_id` → nome) — `text-xs text-neutral-400`, prefixo "Dono:".
6. **Select de stage** (seção 2.2).
7. **Botão "Converter em cliente"**, só quando `stage === "fechado"` (seção 3).

Badge de origem (`SourceBadge`), mesmo padrão do `LinkStatusBadge` da spec de UTM — badge irmão simples, sem herdar de `StatusBadge` (union type não bate):
```tsx
function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
      {source}
    </span>
  );
}
```
`source` é texto livre vindo do schema (não um enum fechado no banco, conforme contexto passado) — exibir como veio, sem tentar mapear para um label fixo. Se no futuro virar enum, trocar para um mapa de labels como em `StatusBadge`.

### 2.4 Indicador de tempo parado na coluna atual

Esse é o dado mais relevante para o "lembrete de follow-up" do agente autônomo (Fase 5) — merece destaque visual proporcional ao tempo parado, não só um texto neutro.

Cálculo: dias desde a última mudança de `stage` (campo `stage_updated_at` — **a confirmar com Backend se esse campo existe no schema atual**; se não existir, usar `updated_at` do prospect como aproximação e anotar a limitação).

```tsx
function StaleIndicator({ updatedAt }: { updatedAt: string }) {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
  if (days < 3) return null; // recente, não precisa de destaque
  const tone =
    days >= 14 ? "bg-status-error/10 text-status-error" :
    days >= 7 ? "bg-status-warning/10 text-status-warning" :
    "bg-neutral-100 text-neutral-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {days}d parado
    </span>
  );
}
```

Faixas sugeridas:
- **< 3 dias**: sem indicador (ruído desnecessário).
- **3–6 dias**: tom neutro (`neutral-100`/`neutral-500`), texto "Xd parado".
- **7–13 dias**: tom de atenção (`status-warning`), mesmo texto.
- **≥ 14 dias**: tom de alerta (`status-error`) — candidato natural a follow-up automático do agente.

Essas faixas são um ponto de **validação com o time**: os limiares (3/7/14 dias) são uma sugestão de design razoável, não um valor vindo do Backend — confirmar se o agente autônomo usa esses mesmos limiares para dar consistência entre o que a UI mostra e o que o agente decide sinalizar.

---

## 3. Converter em cliente

Quando `stage === "fechado"`, o card exibe:
```tsx
<Button variant="primary" className="w-full text-xs" onClick={handleConvert}>
  Converter em cliente
</Button>
```

Comportamento:
1. Ao clicar, chamar `POST /api/prospects/[id]/convert` (endpoint do Backend, em construção — payload esperado a confirmar, mas plausivelmente sem body, já que os dados vêm do próprio prospect).
2. Enquanto a chamada está em andamento: botão mostra "Convertendo..." e fica `disabled`, mesmo padrão de "Salvando...".
3. Sucesso: o card sai do board de pipeline (prospect convertido deixa de ser prospect) — invalidar a query da lista via react-query. Mostrar um feedback simples antes de sumir, ex. trocar brevemente o texto do botão para "Cliente criado!" por ~1s, ou apenas deixar o card sumir com a atualização da lista (mais simples, aceitável para o MVP).
4. Erro: mensagem inline abaixo do botão, `text-xs text-status-error`, ex. "Não foi possível converter este prospect. Tente novamente."

Confirmação antes de converter: usar `window.confirm("Converter {nome} em cliente? Essa ação não pode ser desfeita.")` — mesmo padrão simples de confirmação já usado na spec de exclusão de link UTM, consistente com o resto do projeto (sem modal de confirmação customizado).

**Ponto para validação humana**: confirmar com o Backend o contrato exato de `POST /api/prospects/[id]/convert` — payload de entrada (algum campo extra precisa ser preenchido nessa hora, tipo dados de faturamento do cliente?) e resposta (retorna o `client_id` criado? A UI deveria redirecionar para a página desse novo cliente após a conversão? Recomendação de design: sim, redirecionar para `/clients/[novoClientId]` faria mais sentido do que deixar o usuário no board — mas depende do endpoint retornar o id).

---

## 4. Formulário de criação de prospect

Modal, mesmo padrão do formulário de link UTM (`fixed inset-0 bg-black/40` + `Card` centralizado `max-w-md`).

Título do modal: "Novo prospect".

### 4.1 Campos, em ordem

1. **Nome** (`name`, obrigatório) — `Input` texto livre. Label: "Nome".
2. **Empresa** (`company`, obrigatório) — `Input` texto livre. Label: "Empresa".
3. **Origem** (`source`) — `Input` com `<datalist>` de sugestões comuns (mesmo padrão de datalist da spec de UTM): `indicação`, `site`, `instagram`, `evento`, `outbound`, `linkedin`. Texto livre além disso. Label: "Origem". Opcional — se vazio, salvar como `null`/string vazia (a confirmar com Backend).
4. **Dono** (`owner_user_id`, obrigatório) — `<select>` com a lista de usuários da agência (vem do Server Component). Label: "Dono do prospect". Default: usuário logado atual, se a sessão expuser esse dado facilmente; caso contrário, sem default, obrigando escolha explícita.

Stage inicial: sempre `novo`, não é um campo do formulário — cai automaticamente na primeira coluna do board.

### 4.2 Estados do formulário

Mesmo padrão das outras specs: botão "Salvar" vira "Salvando..." + `disabled` durante o POST; erros de validação inline abaixo de cada campo (`text-xs text-status-error`); sucesso fecha o modal e o react-query invalida a lista, o card novo aparece na coluna "Novo".

### 4.3 Ações do rodapé

`<Button variant="ghost">Cancelar</Button>` + `<Button variant="primary" type="submit">Salvar</Button>`, `flex justify-end gap-2`.

---

## 5. Estados da página

### 5.1 Vazio (nenhum prospect ainda)

Quando não houver nenhum prospect em nenhuma coluna, substituir o board inteiro por um bloco central (mesmo tom das outras specs):

```tsx
<Card className="flex flex-col items-start gap-3 p-6">
  <p className="text-sm text-neutral-500">
    Nenhum prospect cadastrado ainda. Crie o primeiro prospect para começar a acompanhar o funil de vendas.
  </p>
  <Button variant="primary" onClick={openCreateForm}>+ Novo prospect</Button>
</Card>
```

Se houver prospects mas uma coluna específica estiver vazia, essa coluna individual simplesmente fica sem cards (sem mensagem, mesmo comportamento do `KanbanBoard` atual) — não é um "estado vazio" da página, é normal do fluxo.

### 5.2 Erro (falha ao carregar prospects)

```tsx
<p className="text-sm text-status-error">Não foi possível carregar o pipeline. Tente novamente em instantes.</p>
```
Mesmo padrão de extração de erro usado em outras telas (`err instanceof Error ? err.message : "..."`).

### 5.3 Carregando

```tsx
<p className="text-sm text-neutral-400">Carregando pipeline...</p>
```

---

## 6. Copy de referência (pt-BR)

| Elemento | Texto |
|---|---|
| Título da página | Pipeline de vendas |
| Subtítulo | Acompanhe prospects do primeiro contato até o fechamento. |
| Botão novo prospect | + Novo prospect |
| Colunas | Novo / Contatado / Proposta / Fechado / Perdido |
| Prefixo dono no card | Dono: {nome} |
| Indicador de tempo parado | {N}d parado |
| Botão converter | Converter em cliente → Convertendo... |
| Confirmação de conversão | Converter {nome} em cliente? Essa ação não pode ser desfeita. |
| Erro de conversão | Não foi possível converter este prospect. Tente novamente. |
| Label formulário | Nome / Empresa / Origem / Dono do prospect |
| Vazio (board) | Nenhum prospect cadastrado ainda. Crie o primeiro prospect para começar a acompanhar o funil de vendas. |
| Erro de carregamento | Não foi possível carregar o pipeline. Tente novamente em instantes. |
| Carregando | Carregando pipeline... |

---

## 7. Pontos para validação humana

1. **Contrato de `POST /api/prospects/[id]/convert`**: payload de entrada e resposta (retorna `client_id`? deveria redirecionar a UI para a página do novo cliente?).
2. **Campo `stage_updated_at`**: confirmar se existe no schema para calcular o indicador de tempo parado com precisão, ou se será necessário usar `updated_at` como aproximação (menos preciso, pois qualquer edição do prospect resetaria o indicador).
3. **Limiares de "tempo parado" (3/7/14 dias)**: são uma sugestão de design; validar se devem bater com a lógica que o agente autônomo usa para gerar lembretes de follow-up, para consistência entre UI e comportamento do agente.
4. **`source` como texto livre vs. enum fechado**: a spec assume texto livre com sugestões (datalist); confirmar com Backend/PO se deveria ser um enum fechado.
5. **Drag-and-drop no roadmap**: confirmar se dropdown de stage é aceitável para o MVP ou se drag-and-drop é um requisito não-negociável (nesse caso, a spec precisa ser revisada com uma lib como `@dnd-kit`).
