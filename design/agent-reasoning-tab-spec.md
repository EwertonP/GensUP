# Spec — Raciocínio do Agente Autônomo (agent_tasks / agent_runs)

Status: pronto para implementação
Locais:
1. `app/(client-portal)/approvals/[contentItemId]/page.tsx` — bloco novo ao lado de `FeedbackHistoryTimeline`, mostrando as tasks relacionadas àquele item.
2. `app/(agency-portal)/agent-activity/page.tsx` (rota nova) — painel geral de atividade do agente, todas as tasks recentes de todos os clientes.

Consome: `GET /api/agent-tasks?content_item_id=[id]`, `GET /api/agent-tasks` (painel geral, com filtros), `POST /api/agent-tasks` (dispara nova task), `POST /api/agent-runs/[id]/apply` (endpoint de "usar esta sugestão" — a confirmar se existe ou se a ação é só copiar o texto no client, ver seção 3.3)

Reaproveita:
- `components/ui/Card.tsx`, `components/ui/Button.tsx`
- Estilo de timeline de `components/content/FeedbackHistoryTimeline.tsx` (linha vertical, marcador) para a lista de tasks dentro do item, e para o painel geral (lista cronológica simples, sem necessidade de estrutura nova)

---

## 1. Onde entra — decisão

**Ambos os locais pedidos na tarefa fazem sentido e não são redundantes — são públicos diferentes:**
- A aba no `content_item` responde "por que o agente sugeriu isso pra ESTE post?" — útil pro cliente/agência revisando aquele item específico.
- O painel geral responde "o que o agente andou fazendo essa semana, em todos os clientes?" — útil pra agência auditar custo/qualidade do agente de forma agregada, sem entrar item por item.

Implementar os dois. Ordem de prioridade se o Frontend precisar sequenciar: a aba do `content_item` primeiro (menor escopo, resolve o caso de uso mais imediato: "aceitar ou não a legenda sugerida"), o painel geral depois.

---

## 2. Aba de raciocínio do agente no `content_item`

### 2.1 Estrutura

Novo componente `components/agent/AgentReasoningPanel.tsx`, renderizado **ao lado** (não substituindo) de `FeedbackHistoryTimeline` na página `approvals/[contentItemId]/page.tsx`:

```tsx
<FeedbackHistoryTimeline contentItemId={item.id} />
<AgentReasoningPanel contentItemId={item.id} />
```

Empilhados verticalmente (mesma coluna), na mesma ordem que outros blocos da página — não é necessário um sistema de tabs (`Histórico de status` | `Raciocínio do agente`) para o MVP; dois `Card`s empilhados já se leem como seções distintas, consistente com a decisão equivalente já tomada em `design/utm-clicks-tab-spec.md` (seções empilhadas em vez de tabs, por não existir componente de Tabs no design system).

### 2.2 Conteúdo do painel

```tsx
<Card className="flex flex-col gap-3 p-4">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold text-neutral-900">Raciocínio do agente</h3>
    <GenerateCaptionButton contentItemId={contentItemId} /> {/* seção 4 */}
  </div>

  {isLoading && <p className="text-sm text-neutral-400">Carregando sugestões do agente...</p>}
  {isError && <p className="text-sm text-status-error">{errorMessage}</p>}
  {!isLoading && !isError && tasks.length === 0 && (
    <p className="text-sm text-neutral-400">
      Nenhuma sugestão do agente para este item ainda. Use o botão acima para gerar uma legenda.
    </p>
  )}

  {tasks.length > 0 && (
    <ol className="flex flex-col gap-4 border-l border-neutral-200 pl-4">
      {tasks.map((task) => (
        <li key={task.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary-500" />
          <AgentTaskCard task={task} runs={task.runs} contentItemId={contentItemId} />
        </li>
      ))}
    </ol>
  )}
</Card>
```

### 2.3 Card de uma `agent_task` + seus `agent_runs`

Uma task pode ter mais de uma run (retries, ou múltiplas tentativas de geração) — mostrar a run mais recente em destaque, e as anteriores colapsadas (ou simplesmente listadas em ordem cronológica decrescente, mais simples para o MVP — decisão: **listar todas em ordem decrescente, sem colapsar**, para não introduzir um componente de accordion novo).

```tsx
function AgentTaskCard({ task, runs, contentItemId }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TaskTypeLabel type={task.type} />
        <TaskStatusBadge status={task.status} />
        <span className="text-xs text-neutral-400">{new Date(task.created_at).toLocaleString("pt-BR")}</span>
      </div>

      {runs.map((run) => (
        <div key={run.id} className="rounded-md border border-neutral-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <ConfidenceIndicator confidence={run.confidence} />
            <OutcomeBadge outcome={run.outcome} />
          </div>
          <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">{run.reasoning}</p>
          {run.outcome === "sugerido_para_revisao" && (
            <UseSuggestionButton run={run} contentItemId={contentItemId} /> // seção 3.3
          )}
        </div>
      ))}
    </div>
  );
}
```

`TaskTypeLabel`: texto simples mapeando `type` (ex. `caption_suggestion` → "Sugestão de legenda") — mapa a confirmar com Backend, quais valores de `type` existem hoje além do de legenda.

`TaskStatusBadge`: badge irmão simples para `pending/running/completed/failed`:
```tsx
const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", running: "Em execução", completed: "Concluída", failed: "Falhou",
};
const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};
```
Mesmo padrão visual de pill usado em `ActivityTypeBadge` (ver `prospect-activity-timeline-spec.md`).

### 2.4 Como apresentar `confidence` (0–1)

**Decisão: barra + rótulo textual juntos, não um dos dois isolado.**

Racional: só a barra é rápida de escanear mas exige que o usuário interprete a escala; só o texto ("alta confiança") é claro mas perde granularidade. Os dois juntos custam pouco espaço e cobrem ambos os públicos (quem quer escanear rápido vs. quem quer o número exato).

```tsx
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const label = confidence >= 0.75 ? "Alta confiança" : confidence >= 0.4 ? "Média confiança" : "Baixa confiança";
  const color = confidence >= 0.75 ? "bg-emerald-500" : confidence >= 0.4 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-500">{label} ({pct}%)</span>
    </div>
  );
}
```

Faixas sugeridas: **≥ 75% = alta, 40–74% = média, < 40% = baixa**. Mesma ressalva de outras specs: esses limiares são uma proposta de design, não um valor vindo do schema — **validar com o time/Backend** se há uma convenção já definida (ex. o próprio agente já categoriza a confiança em faixas ao gravar o `agent_run`, o que tornaria esse mapeamento redundante/inconsistente se divergir).

### 2.5 Diferenciando `outcome`

`OutcomeBadge`:
```tsx
function OutcomeBadge({ outcome }: { outcome: "aplicado" | "sugerido_para_revisao" }) {
  const isApplied = outcome === "aplicado";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      isApplied ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
    }`}>
      {isApplied ? "Aplicado automaticamente" : "Sugerido para revisão"}
    </span>
  );
}
```

Diferença de comportamento, não só de cor:
- **`aplicado`**: o agente já executou a ação (ex. já preencheu o campo de legenda direto). Não precisa de nenhum botão de ação — é só informativo/auditável. Pode valer a pena um texto adicional pequeno abaixo, tipo "Esta sugestão já foi aplicada automaticamente ao item." se o `reasoning` sozinho não deixar isso óbvio.
- **`sugerido_para_revisao`**: o agente gerou algo mas não agiu sozinho — precisa de uma ação humana explícita. É aqui que entra o botão "Usar esta legenda" (seção 3.3).

### 2.6 Estado vazio

Já coberto na seção 2.2 — texto neutro + referência ao botão de gerar sugestão logo acima, para que o estado vazio já aponte para a próxima ação possível, em vez de ser um beco sem saída.

---

## 3. Ação sobre uma sugestão (`sugerido_para_revisao`)

### 3.1 Botão "Usar esta legenda"

```tsx
function UseSuggestionButton({ run, contentItemId }) {
  return (
    <Button variant="secondary" className="mt-2 text-xs" onClick={() => applySuggestion(run, contentItemId)}>
      Usar esta legenda
    </Button>
  );
}
```

Texto genérico proposto: se o `type` da task não for sempre "sugestão de legenda", trocar o texto do botão dinamicamente (ex. "Usar esta sugestão") — mas como o caso de uso descrito na tarefa é especificamente legenda, a spec assume esse texto por padrão e recomenda tornar o label parametrizável por `task.type` desde já para não precisar de retrabalho quando surgirem outros tipos de `agent_task`.

### 3.2 O que "usar" significa aqui

**Gap identificado**: a página atual (`approvals/[contentItemId]/page.tsx`) **não tem campo de legenda/caption visível hoje** — ela mostra apenas mídia (`VideoPlayer`/`CarouselViewer`/imagem) + `StatusBadge` + `FeedbackHistoryTimeline`. Não existe um campo de texto de legenda editável na página atual para "colar" a sugestão.

Duas opções para o Frontend, a **validar com o time antes de implementar**:
- (a) Este trabalho já pressupõe que um campo de caption editável está sendo adicionado à página em paralelo (fora do escopo desta spec de agente) — nesse caso, "Usar esta legenda" só precisa preencher esse campo (`setState` local, sem chamada de API adicional, já que o campo em si teria seu próprio fluxo de salvar).
- (b) Se não houver plano de adicionar um campo de caption editável nesta fase, "Usar esta legenda" deveria copiar o texto para a área de transferência (`navigator.clipboard.writeText`, mesmo padrão de `CopyLinkButton` da spec de UTM) com feedback "Copiado!" — solução mais simples, não depende de nenhuma outra feature.

Recomendação de design: **(a) é a experiência correta a médio prazo** (clicar em "usar" deveria de fato aplicar a legenda ao item, não só copiar), mas **(b) é o que dá pra entregar sem depender de escopo externo** a esta spec. Sugestão prática: implementar (b) agora (copiar para clipboard) e marcar como TODO a integração direta com o campo de caption assim que ele existir — evita bloquear a entrega desta feature esperando por outra.

### 3.3 Endpoint de "aplicar"

Se o Backend expuser um endpoint dedicado (ex. `POST /api/agent-runs/[id]/apply`) que já atualiza o `content_item` E marca a run como aplicada (mudando `outcome` de `sugerido_para_revisao` para `aplicado`), essa é a opção preferível — mantém o histórico consistente (a run passa a refletir que foi de fato usada). Nesse caso o botão chama esse endpoint em vez de só copiar/preencher local.

**Ponto para validação humana**: confirmar com o Backend se esse endpoint existe ou está planejado. Se não existir, o clique em "Usar esta legenda" fica só no client (clipboard ou preenchimento local) sem persistir a decisão do humano em lugar nenhum — o que é uma perda de auditoria (o agente não saberia depois se a sugestão foi de fato usada). Recomendação: se possível, mesmo sem endpoint dedicado, fazer um `PATCH /api/agent-runs/[id]` simples só para marcar `outcome: "aplicado"` quando o usuário clicar em usar — mantém o dado auditável sem exigir uma feature grande nova.

---

## 4. Botão "Gerar sugestão de legenda"

### 4.1 Onde aparece

No header do `AgentReasoningPanel` (seção 2.2), canto superior direito do card — perto de onde o campo de caption estaria (mesmo bloco visual do painel de raciocínio, já que é isso que ele vai popular). Não colocar perto da mídia (vídeo/carrossel) — ficaria desconectado da área que efetivamente mostra o resultado da geração.

```tsx
function GenerateCaptionButton({ contentItemId }: { contentItemId: string }) {
  return (
    <Button variant="secondary" className="text-xs" onClick={handleGenerate} disabled={isPending}>
      {isPending ? "Gerando..." : "Gerar sugestão de legenda"}
    </Button>
  );
}
```

### 4.2 Comportamento

1. Ao clicar, `POST /api/agent-tasks` com body `{ content_item_id: contentItemId, type: "caption_suggestion" }` (nome exato do `type` a confirmar com Backend).
2. Task é criada com `status: "pending"` — react-query invalida a lista de tasks, o novo item aparece na timeline do painel com badge "Pendente".
3. Se a geração for assíncrona (o agente processa em background), a UI precisa refletir isso — **a confirmar com Backend**: a task muda de status via polling, via webhook/realtime (Supabase Realtime, se já usado em outro lugar do projeto), ou o usuário precisa recarregar a página manualmente? Para o MVP, sugerir polling simples (`refetchInterval: 3000` no react-query enquanto houver alguma task com `status: "pending" | "running"`) — evita depender de infraestrutura de realtime nova.
4. Erro ao disparar: mensagem inline abaixo do botão, `text-xs text-status-error`, "Não foi possível gerar a sugestão. Tente novamente."

### 4.3 Botão repetido

Não há limite de quantas vezes o usuário pode clicar em "Gerar sugestão de legenda" — cada clique cria uma nova `agent_task` independente, empilhando na timeline. Não desabilitar permanentemente após uma geração; apenas desabilitar durante o `isPending` da chamada em si, para evitar duplo clique acidental.

---

## 5. Painel geral de atividade do agente (portal da agência)

### 5.1 Estrutura

Rota nova: `app/(agency-portal)/agent-activity/page.tsx`.

```
app/(agency-portal)/agent-activity/page.tsx       → Server Component: busca clientes (para filtro) e renderiza <AgentActivityFeed />
components/agent/AgentActivityFeed.tsx            → Client Component: lista + filtros
```

Título: `<h1 className="text-xl font-semibold">Atividade do agente</h1>`.
Subtítulo: "Acompanhe as sugestões e ações automáticas do agente em todos os clientes."

### 5.2 Filtros

Barra simples no topo, reaproveitando o padrão de `<select>` de cliente já definido em `utm-link-management-spec.md` (seção 2.1):
- **Cliente**: "Todos os clientes" + lista.
- **Status** (opcional, recomendado): "Todos" / Pendente / Em execução / Concluída / Falhou.
- **Outcome** (opcional): "Todos" / Aplicado automaticamente / Sugerido para revisão.

### 5.3 Lista

Mesmo componente visual de timeline usado na seção 2 (`AgentTaskCard`), mas cada item ganha um cabeçalho extra com o nome do cliente (já que aqui não há um `content_item` único de contexto):

```tsx
<div className="flex items-center justify-between">
  <span className="text-xs font-medium text-neutral-600">{task.client_name}</span>
  <span className="text-xs text-neutral-400">{new Date(task.created_at).toLocaleString("pt-BR")}</span>
</div>
```

Reaproveitar `AgentTaskCard` diretamente (extrair para `components/agent/AgentTaskCard.tsx` desde já, para não duplicar entre esta seção e a seção 2) — passando `showClientName` como prop opcional para exibir/ocultar o nome do cliente conforme o contexto (na aba do item já se sabe o cliente pelo breadcrumb da página, no painel geral não).

Se a task estiver associada a um `content_item`, incluir um link "Ver item" que leva para `approvals/[contentItemId]` — útil para ir da visão geral direto ao contexto específico.

Paginação/limite: mostrar as 30 mais recentes por padrão, sem paginação completa no MVP (consistente com a decisão equivalente em `utm-clicks-tab-spec.md` para a tabela de cliques por link) — anotar como possível v2 se o volume crescer.

### 5.4 Estado vazio

```tsx
<p className="text-sm text-neutral-500">
  Nenhuma atividade do agente registrada ainda. As sugestões e ações automáticas aparecerão aqui conforme forem geradas.
</p>
```

---

## 6. Copy de referência (pt-BR)

| Elemento | Texto |
|---|---|
| Título do painel (item) | Raciocínio do agente |
| Título da página geral | Atividade do agente |
| Subtítulo da página geral | Acompanhe as sugestões e ações automáticas do agente em todos os clientes. |
| Botão gerar | Gerar sugestão de legenda → Gerando... |
| Botão usar sugestão | Usar esta legenda |
| Feedback de cópia | Copiado! |
| Badge outcome aplicado | Aplicado automaticamente |
| Badge outcome revisão | Sugerido para revisão |
| Rótulos de confiança | Alta confiança / Média confiança / Baixa confiança |
| Status de task | Pendente / Em execução / Concluída / Falhou |
| Vazio (item) | Nenhuma sugestão do agente para este item ainda. Use o botão acima para gerar uma legenda. |
| Vazio (painel geral) | Nenhuma atividade do agente registrada ainda. As sugestões e ações automáticas aparecerão aqui conforme forem geradas. |
| Erro ao gerar | Não foi possível gerar a sugestão. Tente novamente. |
| Link para o item | Ver item |

---

## 7. Pontos para validação humana

1. **Campo de caption/legenda na página de aprovação**: hoje `approvals/[contentItemId]/page.tsx` não tem nenhum campo de legenda editável. Confirmar se essa feature está no escopo de outro subagente (Frontend/Backend) em paralelo — o botão "Usar esta legenda" depende disso para ter o comportamento ideal (preencher o campo real em vez de só copiar).
2. **Endpoint de "aplicar" (`POST /api/agent-runs/[id]/apply` ou `PATCH`)**: confirmar se existe/está planejado, para persistir a decisão humana de "usei esta sugestão" e manter o outcome auditável.
3. **Nomes exatos de `agent_tasks.type`**: a spec assume `caption_suggestion` como exemplo; confirmar o valor real e se há outros tipos já previstos, para o mapa `TaskTypeLabel`.
4. **Atualização de status assíncrona**: confirmar se há Supabase Realtime disponível no projeto para refletir mudanças de status de `agent_tasks` sem polling, ou se polling (`refetchInterval`) é aceitável para o MVP.
5. **Faixas de confiança (75%/40%)**: confirmar se essas faixas já existem em alguma convenção do Backend/agente, para não divergir entre o que a UI categoriza e o que o sistema realmente usa internamente.
