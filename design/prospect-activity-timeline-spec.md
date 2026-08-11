# Spec — Detalhe de Prospect e Timeline de Atividades (Portal da Agência)

Status: pronto para implementação
Rota sugerida: `app/(agency-portal)/pipeline/[id]/page.tsx`
Consome: `GET /api/prospects/[id]`, `GET /api/activities?prospect_id=[id]`, `POST /api/activities`

Reaproveita os primitivos existentes:
- `components/ui/Card.tsx`
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- Badges próprios criados em `design/sales-pipeline-spec.md` (`SourceBadge`, stage badge — ver seção 2)

Referência de estilo direta: `components/content/FeedbackHistoryTimeline.tsx` (timeline vertical com linha `border-l`, marcador circular, texto secundário abaixo de cada item). A timeline de atividades do prospect segue exatamente essa estrutura visual, adaptada para os tipos de atividade de CRM em vez de mudanças de status.

Nota importante de schema: `activities` é compartilhada entre `prospect_id` e `client_id` (ver contexto da tarefa) — esta página é a "metade prospect" dessa timeline. O componente de timeline deve ser genérico o bastante para ser reaproveitado depois na página de cliente ativo (pós-conversão), recebendo `prospectId` OU `clientId` como prop, não os dois.

---

## 1. Estrutura da página

```
app/(agency-portal)/pipeline/[id]/page.tsx       → Server Component: busca o prospect, notFound() se não existir, renderiza header + <ActivityTimeline>
components/pipeline/ProspectHeader.tsx           → dados do prospect no topo
components/activities/ActivityTimeline.tsx       → Client Component genérico (prospect OU client), lista + formulário de nova atividade
components/activities/ActivityForm.tsx           → formulário rápido (tipo + corpo)
components/activities/ActivityTypeBadge.tsx      → badge pequeno por tipo de atividade
```

`ActivityTimeline` fica em `components/activities/` (não em `components/pipeline/`) exatamente porque será reaproveitado na página de cliente ativo mais adiante — não é exclusivo do fluxo de pipeline.

---

## 2. Dados do prospect no topo

```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="text-xl font-semibold">{prospect.name}</h1>
      <p className="text-sm text-neutral-500">{prospect.company}</p>
    </div>
    <StageBadge stage={prospect.stage} />
  </div>
  <div className="flex flex-wrap items-center gap-2">
    <SourceBadge source={prospect.source} />
    <span className="text-xs text-neutral-400">Dono: {prospect.owner_name}</span>
  </div>
</div>
```

### 2.1 Badge de stage (`StageBadge`)

Mesmo padrão de badge irmão usado no resto do projeto (não estende `StatusBadge`, union type diferente). Cores sugeridas — reaproveitar as mesmas chaves de `design-tokens.json` → `colors.status` sempre que o significado semântico for equivalente, para não inventar uma paleta nova:

| stage | cor sugerida (token) | label |
|---|---|---|
| `novo` | `status.draft` (`#94a3b8`, cinza) | Novo |
| `contatado` | `status.in_review` (`#3b82f6`, azul) | Contatado |
| `proposta` | `status.scheduled` (`#6366f1`, roxo/azul) | Proposta |
| `fechado` | `status.approved` (`#10b981`, verde) | Fechado |
| `perdido` | `status.error` (`#ef4444`, vermelho) | Perdido |

```tsx
const STAGE_LABELS: Record<string, string> = {
  novo: "Novo", contatado: "Contatado", proposta: "Proposta", fechado: "Fechado", perdido: "Perdido",
};
const STAGE_COLORS: Record<string, string> = {
  novo: tokens.colors.status.draft,
  contatado: tokens.colors.status.in_review,
  proposta: tokens.colors.status.scheduled,
  fechado: tokens.colors.status.approved,
  perdido: tokens.colors.status.error,
};

function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: STAGE_COLORS[stage] }}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
```

Esse mesmo `StageBadge` deve ser usado no card do board (`sales-pipeline-spec.md`) se o Frontend quiser exibir o stage explicitamente ali também — hoje a spec do board usa um `<select>` em vez de badge porque o campo é editável ali; nesta página de detalhe o stage é só leitura (edição acontece no board, não aqui), então badge é a escolha certa.

---

## 3. Timeline de atividades

Estrutura idêntica a `FeedbackHistoryTimeline`, adaptada:

```tsx
<Card className="flex flex-col gap-3 p-4">
  <h3 className="text-sm font-semibold text-neutral-900">Atividades</h3>

  <ActivityForm prospectId={prospectId} /* seção 4 */ />

  {activitiesQuery.isLoading && <p className="text-sm text-neutral-400">Carregando atividades...</p>}
  {activitiesQuery.isError && <p className="text-sm text-status-error">{errorMessage}</p>}

  {!isLoading && !isError && activities.length === 0 && (
    <p className="text-sm text-neutral-400">Nenhuma atividade registrada ainda. Use o formulário acima para começar.</p>
  )}

  {activities.length > 0 && (
    <ol className="flex flex-col gap-3 border-l border-neutral-200 pl-4">
      {activities.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary-500" />
          <div className="flex flex-wrap items-center gap-2">
            <ActivityTypeBadge type={a.type} />
            <span className="text-xs text-neutral-400">
              {a.created_by_name ?? "Sistema"} · {new Date(a.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{a.body}</p>
        </li>
      ))}
    </ol>
  )}
</Card>
```

Ordenação: mais recente primeiro (mesmo padrão de timelines de auditoria — o que aconteceu por último é o mais relevante para quem está retomando o contato).

### 3.1 Badge de tipo de atividade (`ActivityTypeBadge`)

```tsx
const ACTIVITY_LABELS: Record<string, string> = {
  email: "Email", ligacao: "Ligação", nota: "Nota", reuniao: "Reunião",
};
const ACTIVITY_COLORS: Record<string, string> = {
  email: "bg-blue-100 text-blue-700",
  ligacao: "bg-emerald-100 text-emerald-700",
  nota: "bg-neutral-100 text-neutral-600",
  reuniao: "bg-purple-100 text-purple-700",
};

function ActivityTypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTIVITY_COLORS[type] ?? "bg-neutral-100 text-neutral-600"}`}>
      {ACTIVITY_LABELS[type] ?? type}
    </span>
  );
}
```
Essas cores usam classes Tailwind diretas (não tokens de `colors.status`, que são específicas de conteúdo/CRM stage) — como são só 4 variações estáveis de tipo de atividade, não há necessidade de passar por `design-tokens.json` para isso; se o time preferir formalizar, pode virar uma nova chave `colors.activityType` no token file depois, sem urgência.

---

## 4. Formulário rápido de nova atividade

Fica **dentro** do card de timeline (topo, acima da lista), não em modal — é uma ação frequente e de baixo atrito, então não deve exigir abrir/fechar um overlay a cada registro.

```tsx
<form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
  <div className="flex gap-2">
    <select value={type} onChange={...} className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm">
      <option value="nota">Nota</option>
      <option value="email">Email</option>
      <option value="ligacao">Ligação</option>
      <option value="reuniao">Reunião</option>
    </select>
  </div>
  <textarea
    value={body}
    onChange={...}
    rows={2}
    placeholder="Descreva o que aconteceu..."
    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
  />
  <div className="flex justify-end">
    <Button variant="primary" type="submit" disabled={!body.trim() || isSubmitting}>
      {isSubmitting ? "Registrando..." : "Registrar atividade"}
    </Button>
  </div>
</form>
```

Campos: **tipo** (select, default "Nota" — é o tipo mais genérico/rápido de registrar) + **corpo do texto** (`textarea`, não `Input` de uma linha — atividades de CRM tendem a ter mais de uma frase, ex. resumo de ligação).

Não existe `Textarea.tsx` no design system atual (`components/ui/` só tem `Input`) — usar `<textarea>` nativo com as mesmas classes de borda/foco do `Input.tsx`, para manter consistência visual sem criar um componente novo só para isso nesta spec (decisão do Frontend se vale a pena extrair um `Textarea.tsx` reutilizável, dado que "nota"/"corpo de feedback" provavelmente aparece em outros lugares do produto).

### 4.1 Estados do formulário

- Corpo vazio: botão "Registrar atividade" fica `disabled` (sem necessidade de mensagem de erro, é auto-evidente).
- Enviando: botão vira "Registrando..." + `disabled`.
- Sucesso: limpar o `textarea`, manter o tipo selecionado (facilita registrar várias notas seguidas do mesmo tipo), react-query invalida a lista e a nova atividade aparece no topo da timeline.
- Erro: mensagem inline abaixo do formulário, `text-xs text-status-error`, ex. "Não foi possível registrar a atividade. Tente novamente."

---

## 5. Estados da página

- **Prospect não encontrado**: `notFound()` no Server Component (mesmo padrão de `approvals/[contentItemId]/page.tsx`).
- **Erro ao carregar atividades**: mensagem inline dentro do card de timeline, não bloqueia o restante da página (header do prospect continua visível).
- **Nenhuma atividade ainda**: texto neutro dentro do card, ver seção 3.

---

## 6. Copy de referência (pt-BR)

| Elemento | Texto |
|---|---|
| Título do card | Atividades |
| Placeholder textarea | Descreva o que aconteceu... |
| Tipos | Nota / Email / Ligação / Reunião |
| Botão registrar | Registrar atividade → Registrando... |
| Vazio | Nenhuma atividade registrada ainda. Use o formulário acima para começar. |
| Carregando | Carregando atividades... |
| Erro ao registrar | Não foi possível registrar a atividade. Tente novamente. |
| Prefixo dono | Dono: {nome} |

---

## 7. Pontos para validação humana

1. **Reaproveitamento de `ActivityTimeline` para clientes ativos**: confirmar que o componente genérico (prop `prospectId` ou `clientId`) é o formato que o Backend espera na query string/endpoint (`GET /api/activities?prospect_id=` vs. `?client_id=`), para não ter que refatorar quando a timeline for ligada à página de cliente.
2. **`created_by_name`**: confirmar se a API já retorna o nome do usuário que criou a atividade (join) ou se o Frontend precisa resolver isso separadamente a partir de `created_by` (id).
3. **Extração de `Textarea.tsx`**: fica a critério do Frontend formalizar um componente `Textarea` no design system agora ou usar `<textarea>` nativo só nesta feature.
