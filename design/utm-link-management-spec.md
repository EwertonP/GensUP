# Spec — Gestão de Links UTM (Portal da Agência)

Status: pronto para implementação
Rota sugerida: `app/(agency-portal)/links/page.tsx` (+ `components/utm-links/` para os componentes de cliente)
Consome: `GET/POST /api/utm-links`, `GET/PUT/DELETE /api/utm-links/[id]`

Reaproveita os primitivos existentes — não criar nenhum estilo novo de botão, card, input ou badge:
- `components/ui/Card.tsx`
- `components/ui/Button.tsx` (variants `primary` / `secondary` / `danger` / `ghost`)
- `components/ui/Input.tsx`
- `components/ui/Badge.tsx` (exporta `StatusBadge`, tokens de cor vêm de `design-tokens.json` → `colors.status`)

Convenções de código herdadas de `InsightsDashboard.tsx` / `insights/page.tsx`: Server Component busca dados iniciais via Supabase (RLS cuida do escopo), Client Component (`"use client"`) cuida de mutações com `@tanstack/react-query`, textos em pt-BR, `Intl.NumberFormat("pt-BR")` para números, `toLocaleDateString("pt-BR")` para datas, paleta `neutral-*` para textos secundários.

---

## 1. Estrutura da página

```
app/(agency-portal)/links/page.tsx        → Server Component: busca clientes (para o seletor) e renderiza <UtmLinksManager />
components/utm-links/UtmLinksManager.tsx  → Client Component: estado da tela (lista + modal de form)
components/utm-links/UtmLinkList.tsx      → tabela/lista de links
components/utm-links/UtmLinkForm.tsx      → formulário de criação/edição
components/utm-links/CopyLinkButton.tsx   → botão de copiar com feedback
```

Título da página: `<h1 className="text-xl font-semibold">Links UTM</h1>` — mesmo padrão de `<h1>` usado em `insights/page.tsx`.

Subtítulo/descrição curta abaixo do H1 (texto `text-sm text-neutral-500`):
> "Crie links rastreáveis para campanhas e gerencie o Link na Bio de cada cliente."

Botão de ação principal no canto superior direito do header da página: `<Button variant="primary">+ Novo link</Button>` — abre o formulário (ver seção 3).

---

## 2. Listagem de links

A agência atende vários clientes, então a listagem **não é uma tabela única e plana** — ela é agrupada por cliente, com um seletor de cliente controlando o que aparece (evita rolagem infinita misturando links de contas diferentes).

### 2.1 Seletor de cliente (filtro da listagem)

No topo da área de listagem, um `<select>` estilizado como `Input` (reaproveitar as mesmas classes de borda/foco) ou um dropdown simples:

- Label: "Cliente"
- Opção padrão: "Todos os clientes" (mostra todos, com uma coluna/tag de cliente visível em cada linha)
- Demais opções: nome de cada cliente ativo da agência

Quando "Todos os clientes" estiver selecionado, adicionar uma coluna extra "Cliente" na tabela. Quando um cliente específico estiver selecionado, essa coluna some (contexto já está claro).

### 2.2 Tabela / lista

Usar `Card` como container da tabela inteira (`<Card className="overflow-hidden">`), com uma tabela HTML nativa dentro (`<table className="w-full text-sm">`), consistente com o estilo "sem lib pesada" já adotado no projeto (ver `InsightsDashboard.tsx`, que evita libs de gráfico).

Colunas, nesta ordem:

| Coluna | Conteúdo | Detalhe |
|---|---|---|
| Título | `title` | `font-medium text-neutral-900`, trunca com `truncate max-w-[220px]` |
| Cliente | nome do cliente | só aparece se filtro = "Todos os clientes" |
| Link | `seusite.com/l/{slug}` | fonte monoespaçada pequena (`font-mono text-xs text-neutral-500`) + botão de copiar (ver 2.4) ao lado |
| Destino | `destination_url` | truncado, `text-neutral-500 text-xs`, com `title={destination_url}` para tooltip nativo no hover |
| Cliques | contagem de cliques (se a API expuser; caso contrário omitir a coluna nesta v1 e anotar como "TODO: exibir quando `GET /api/utm-links/clicks` estiver disponível por link") | número formatado com `Intl.NumberFormat("pt-BR")`, alinhado à direita, `tabular-nums` |
| Status | ativo/inativo | ver 2.3 |
| Ações | editar / ativar-desativar / excluir | ícones ou texto pequeno, `Button variant="ghost"` para editar, `Button variant="danger"` (ou `ghost` + texto vermelho) para excluir |

Cada linha: `hover:bg-neutral-50`, borda inferior `border-b border-neutral-100`, altura confortável (`py-3`).

### 2.3 Indicador ativo/inativo

Reusar o padrão visual de `StatusBadge`, mas como essa é literalmente para status de conteúdo (`draft`/`in_review`/etc.), **não reaproveitar o componente `StatusBadge` diretamente** (o union type não bate). Criar um badge irmão simples, mesmo estilo visual:

```tsx
function LinkStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
        isActive ? "bg-status-approved" : "bg-neutral-400"
      }`}
    >
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}
```

Confirmar em `design-tokens.json` qual chave de `colors.status` representa "ativo/positivo" (ex.: `approved` ou `published`) e usar essa cor — não inventar uma nova. Se preferir consistência total, pode-se estender `Badge.tsx` para aceitar um variant genérico `"active" | "inactive"` além do union de conteúdo — decisão do Frontend, ambas soluções são aceitáveis, mas **não deve existir um segundo sistema de cores para status**.

### 2.4 Copiar link (ação de clipboard)

Botão pequeno ao lado do slug, ícone de copiar (texto "Copiar" se não houver ícone disponível no projeto):

```tsx
<Button variant="ghost" className="px-2 py-1 text-xs" onClick={handleCopy}>
  Copiar
</Button>
```

Comportamento:
1. `navigator.clipboard.writeText(fullUrl)`
2. Ao sucesso, trocar o texto do botão para "Copiado!" por ~1.5s (via `useState` local), depois reverter. Não usar toast/modal — feedback inline é suficiente e não bloqueia a leitura da tabela.
3. Em caso de falha (clipboard indisponível), mostrar texto "Não foi possível copiar" no mesmo local, cor `text-status-error`.

Copy sugerido do texto do botão: **"Copiar"** → **"Copiado!"**. Manter em minúsculas/estilo consistente com o resto da UI (botões atuais usam sentence case, ex. "Sincronizar agora").

### 2.5 Estado vazio (nenhum link ainda)

Quando a lista (para o cliente selecionado, ou geral) estiver vazia, substituir a tabela por um `Card` centralizado, no mesmo tom dos estados vazios já usados em `insights/page.tsx`:

```tsx
<Card className="flex flex-col items-start gap-3 p-6">
  <p className="text-sm text-neutral-500">
    Nenhum link UTM criado ainda{clienteSelecionado ? ` para ${nomeDoCliente}` : ""}.
    Crie o primeiro link para começar a rastrear cliques em campanhas.
  </p>
  <Button variant="primary" onClick={openCreateForm}>+ Novo link</Button>
</Card>
```

---

## 3. Formulário de criação/edição

Renderizar como modal/painel sobreposto (Client Component com estado `isOpen`), ou como seção inline no topo da página — decisão do Frontend, mas recomenda-se **modal** para não empurrar a listagem para baixo. Se optar por modal, usar um overlay simples (`fixed inset-0 bg-black/40` + `Card` centralizado, `max-w-lg`), sem lib nova de modal.

Título do modal: "Novo link UTM" (criação) ou "Editar link" (edição).

### 3.1 Campos, em ordem

1. **Cliente** (obrigatório) — ver seção 3.2, seletor no topo do formulário
2. **Título** (`title`, obrigatório) — `Input` de texto livre. Label: "Título". Helper text: "Nome interno para identificar o link (ex.: 'Post Reels — Promoção Agosto')."
3. **Slug** (`slug`, obrigatório) — `Input` de texto. Label: "Slug". Ao lado ou abaixo, preview em tempo real do link final:
   ```
   seusite.com/l/{slug || "seu-slug"}
   ```
   estilizado como `text-xs font-mono text-neutral-500`, atualizando a cada tecla (`onChange` local, sem debounce necessário — é só texto formatado). Validar client-side: apenas `a-z0-9-`, sem espaços/acentos; normalizar automaticamente enquanto o usuário digita (lowercase, espaços viram `-`) para reduzir fricção.
4. **URL de destino** (`destination_url`, obrigatório) — `Input type="url"`. Label: "URL de destino". Placeholder: `https://...`.
5. **Parâmetros UTM** — agrupar visualmente em um bloco com título pequeno "Parâmetros UTM" (`text-xs font-semibold uppercase text-neutral-500`), mostrando os campos abaixo. Ver decisão de UX em 3.3.
   - `utm_source` (obrigatório pela lógica de UTM, mas pode ficar opcional na tela se a API aceitar vazio — confirmar com Backend)
   - `utm_medium`
   - `utm_campaign`
   - `utm_content` (opcional)
   - `utm_term` (opcional)
6. **Ativo** (`is_active`) — toggle/checkbox no rodapé do formulário, antes dos botões de ação. Label: "Link ativo" com helper text: "Links inativos continuam existindo mas retornam erro 404 ao serem acessados." Default `true` na criação.

### 3.2 Seletor de cliente no formulário

Na criação: `<select>` obrigatório, primeira posição do formulário, label "Cliente". Placeholder/opção vazia: "Selecione o cliente...". Sem esse campo preenchido, o botão "Salvar" fica desabilitado.

Na edição: campo **não editável** (mostrar como texto estático "Cliente: {nome}", não como select) — mover um link de UTM entre clientes depois de criado é uma operação perigosa (afeta o Link na Bio do cliente errado) e está fora do escopo do MVP.

### 3.3 Campos de UTM — texto livre vs. dropdown guiado

Decisão recomendada para o MVP: **texto livre com sugestões (datalist), não dropdown fechado.**

Racional: a arquitetura já decidiu que esses campos são "guiados por formulário, não digitação livre solta", o que aqui interpreto como "guiados o suficiente para reduzir erro de digitação/typo entre campanhas", não como um enum fechado — porque `utm_campaign` e `utm_content` variam por campanha e não dá pra prever todos os valores possíveis num enum estático.

Implementação sugerida:
- `utm_source`: `<input list="utm-source-options">` com um `<datalist>` populado com os valores mais comuns: `instagram`, `facebook`, `google`, `whatsapp`, `email`, `linkedin`. Usuário pode digitar outro valor livremente.
- `utm_medium`: mesmo padrão, `<datalist>` com: `social`, `cpc`, `email`, `referral`, `organic`, `stories`, `bio`.
- `utm_campaign`, `utm_content`, `utm_term`: `Input` de texto livre puro, sem datalist (são específicos da campanha/peça, sugerir valor genérico não ajuda).

Isso evita inventar uma UI nova (dropdown customizado) reaproveitando o `<input>` nativo com `list=`, funciona com o `Input.tsx` existente sem alterações de componente, e ainda guia o usuário para os valores mais usados sem travar casos novos. Se o Backend/PO quiser um enum fechado de verdade no futuro, é uma troca de `<datalist>` por `<select>` sem mudar a estrutura do form.

Marcar esse ponto como **a validar com o time**: se a intenção original era um dropdown fechado (sem opção de texto livre), o Frontend deve confirmar antes de implementar — isso muda a validação e o copy de erro.

### 3.4 Estados do formulário

- **Salvando**: botão "Salvar" mostra "Salvando..." e fica `disabled`, mesmo padrão do botão "Sincronizar agora" em `InsightsDashboard.tsx`.
- **Erro de slug duplicado**: a API deve retornar 409 (ou erro reconhecível) quando o slug já existe. Exibir erro **inline, abaixo do campo Slug**, não em banner genérico:
  ```
  <p className="text-xs text-status-error mt-1">
    Esse slug já está em uso. Escolha outro, por exemplo: {slug}-2
  </p>
  ```
  Sugerir automaticamente um slug alternativo (`{slug}-2`) como texto clicável que preenche o campo, se for simples de implementar; caso contrário, só a mensagem já é suficiente.
- **Outros erros de validação** (URL inválida, campos obrigatórios vazios): mensagem inline abaixo de cada campo, mesmo estilo (`text-xs text-status-error`), não bloquear o campo — deixar o usuário corrigir e tentar de novo.
- **Sucesso ao salvar**: fechar o modal e voltar para a listagem, com a linha nova/editada em destaque temporário (ex.: `bg-primary-50` por ~2s, opcional) — ou, mais simples para o MVP, apenas fechar o modal e deixar o react-query invalidar a query e re-renderizar a lista já atualizada, sem highlight.

### 3.5 Ações do rodapé

`<Button variant="ghost">Cancelar</Button>` + `<Button variant="primary" type="submit">Salvar</Button>`, alinhados à direita (`flex justify-end gap-2`).

Na edição, adicionar também a opção de excluir o link — mas não como terceiro botão no mesmo rodapé (risco de clique acidental). Colocar `<Button variant="danger">Excluir link</Button>` isolado, alinhado à esquerda do mesmo rodapé (`flex justify-between`), com confirmação simples via `window.confirm("Excluir este link? Essa ação não pode ser desfeita.")` — suficiente para o MVP, sem modal de confirmação customizado.

---

## 4. Copy de referência (pt-BR)

| Elemento | Texto |
|---|---|
| Título da página | Links UTM |
| Subtítulo | Crie links rastreáveis para campanhas e gerencie o Link na Bio de cada cliente. |
| Botão novo link | + Novo link |
| Label seletor de cliente | Cliente |
| Placeholder seletor | Selecione o cliente... |
| Vazio (lista) | Nenhum link UTM criado ainda[ para {cliente}]. Crie o primeiro link para começar a rastrear cliques em campanhas. |
| Botão copiar | Copiar → Copiado! |
| Erro slug duplicado | Esse slug já está em uso. Escolha outro, por exemplo: {slug}-2 |
| Toggle ativo | Link ativo — Links inativos continuam existindo mas retornam erro 404 ao serem acessados. |
| Confirmação de exclusão | Excluir este link? Essa ação não pode ser desfeita. |
| Botão salvando | Salvando... |

---

## 5. Pontos para validação humana

1. **Coluna de cliques na listagem**: confirmar se existe (ou vai existir) um endpoint que retorna contagem de cliques por link para popular essa coluna na v1, ou se ela deve ficar de fora até a Fase 3 de analytics avançar.
2. **Campos UTM — datalist vs. select fechado**: confirmar se "guiado por formulário" significa sugestões (datalist, editável) ou enum fechado (select, não editável). A spec assume datalist; se for select fechado, os valores permitidos precisam ser definidos.
3. **`utm_source` obrigatório ou opcional na UI**: confirmar com o schema/API se pode ser salvo vazio.
4. **Local do seletor de cliente**: confirmar se a agência tem, em algum outro lugar do portal, um seletor de cliente global (ex. no layout/topo da aplicação) que já deveria ser reaproveitado aqui em vez de duplicar um seletor local na página de Links.
