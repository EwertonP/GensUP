# Revisão de Segurança — Fase 1 (isolamento multi-tenant)

Revisão feita em paralelo a outros dois agentes (um em `app/api/**`+`supabase/**` para
storage/notificações, outro em `app/(client-portal)/`, `app/(agency-portal)/`, `components/`
para integrar a API). Este documento cobre apenas os achados que **exigem decisão de produto/
arquitetura** e não foram corrigidos diretamente. Os achados corrigidos estão listados no final,
com o commit correspondente.

Nota: `CLAUDE.md` (raiz) e `../plataforma-agencia-arquitetura.md` não existem neste repositório/
worktree no momento da revisão — a análise usou `STATUS_FASE_0.md` e `docs/backend/MULTI_TENANT.md`
como fonte de verdade da arquitetura multi-tenant.

---

## Achados documentados (não corrigidos — decisão de produto/arquitetura necessária)

### 1. [CRÍTICO] Edge Functions não validam role nem posse do recurso — apenas exigem um JWT válido
**Arquivos:** `supabase/functions/sync-insights/index.ts`, `supabase/functions/publish-content/index.ts`,
`supabase/functions/agent-worker/index.ts`, `supabase/config.toml`

As rotas Next.js (`/api/insights/sync`, futura rota de publish, etc.) fazem `requireRole(["agencia","admin"])`
antes de chamar a Edge Function com a `service_role` key. Porém as Edge Functions em si:
- Não têm `verify_jwt = false` configurado em `supabase/config.toml` (nenhuma seção `[functions.*]` existe),
  então o comportamento padrão do Supabase CLI é `verify_jwt = true` — ou seja, **qualquer usuário autenticado**
  (inclusive role `cliente`, de qualquer client_id) pode chamar essas funções diretamente pela URL pública
  `https://<project>.functions.supabase.co/sync-insights` (etc.) passando seu próprio JWT de sessão.
- Uma vez dentro da função, o código usa `service_role` (ignora RLS) e busca o recurso só por `id`, sem
  jamais comparar `social_account_id`/`content_item_id` contra o `client_id` do chamador — porque a função
  não tem noção de quem é o chamador além de "tem um JWT válido".

**Impacto:** um usuário `cliente` do Client A pode, hoje, chamar `sync-insights` diretamente (fora do app)
passando um `social_account_id` do Client B; quando a implementação da Graph API for concluída (está como
`TODO`/`501` agora), isso viraria leitura/gravação cross-tenant real. O mesmo vale para `publish-content`
(publicar conteúdo de outro cliente) e `agent-worker` (processar fila de tarefas sem filtro de tenant).

**Recomendação (decisão de arquitetura):** escolher uma de duas abordagens antes de implementar a lógica
real dessas funções:
  (a) Definir `verify_jwt = false` nessas functions e protegê-las com um shared secret próprio (header
      customizado) conhecido apenas pelas rotas Next.js — nunca expostas a JWT de usuário final; ou
  (b) Manter `verify_jwt = true` mas fazer a function decodificar o JWT do chamador, extrair
      `app_metadata.role`/`client_id` e validar role + posse do recurso (`account.client_id === callerClientId`)
      antes de qualquer operação — replicando a checagem que hoje só existe na camada Next.js.
Como isso muda o contrato de autenticação das Edge Functions (usadas por outro agente que está mexendo em
`supabase/**` agora), não foi alterado nesta revisão para evitar conflito — só documentado.

---

### 2. [MÉDIO] `content_items` PATCH (`app/api/content-items/[id]/route.ts`) aceita `status` livre no body, contornando a máquina de estados
**Arquivo:** `app/api/content-items/[id]/route.ts`

O endpoint `PATCH /api/content-items/[id]` permite que qualquer usuário `agencia`/`admin` faça
`update(body)` com o body inteiro do request — incluindo o campo `status`. Isso contorna as transições
validadas em `app/api/content-items/[id]/status/route.ts` (`draft → in_review → ...`), que é o endpoint
"oficial" para mudar status. Não é um vazamento cross-tenant (RLS ainda impede alterar `client_id` para
outro tenant, via `with check`), mas é uma inconsistência de regra de negócio: um `agencia` pode pular
direto para `published` sem passar por `in_review`/`approved`.

**Recomendação:** decidir se `PATCH /api/content-items/[id]` deve excluir `status` do body (forçando uso
exclusivo de `/status`) ou se a intenção é permitir edição livre por `agencia`/`admin`. Não corrigido aqui
por ser decisão de fluxo de produto, não bug de isolamento.

---

### 3. [BAIXO] `video_feedback` / `carousel_feedback` não têm policy de `update`/`delete`
**Arquivo:** `supabase/migrations/002_rls_policies.sql`

As tabelas de feedback só têm policies de `select` e `insert`. Isso significa que, hoje, **ninguém**
(nem o autor do comentário, nem `agencia`, nem `admin` via JWT de usuário) consegue marcar um feedback
como `resolved` via RLS — só via `service_role`. Não é um risco de vazamento (RLS nega por padrão), mas é
provavelmente uma lacuna funcional: o schema tem uma coluna `status` (`open`/`resolved`) sem caminho de
escrita.

**Recomendação:** decidir quem pode resolver feedback (autor? qualquer um do mesmo `client_id`? só
`agencia`?) e adicionar a policy correspondente — depende de regra de produto, não decidido aqui.

---

### 4. [BAIXO] RLS de `content_items`/`social_accounts` (insert) não restringe por `role`, só por `client_id`
**Arquivo:** `supabase/migrations/002_rls_policies.sql`

`content_items_write_same_client` (insert) e a parte de insert de `social_accounts_agencia_write` restringem
por `client_id`, e a segunda também por role. Mas `content_items_write_same_client` permite insert de
**qualquer role** do mesmo `client_id` (inclusive `cliente`), contando apenas com a camada de API
(`app/api/content-items/route.ts` já faz `if (ctx.role !== "agencia" && ctx.role !== "admin")`) para barrar
isso. Hoje não há nenhum código que chame `supabase.from("content_items").insert(...)` direto do browser
(`lib/supabase/client.ts` não é usado em `components/` ainda), então não é um vazamento ativo — mas se um
componente client-side vier a inserir direto via Supabase client (bypassando a rota API), um `cliente`
poderia criar `content_items` no próprio tenant. Isso é "apenas" escalação de permissão dentro do próprio
tenant (não cross-tenant), mas ainda é uma regra de negócio que RLS não replica.

**Recomendação:** se o app pretende algum dia escrever direto do browser (sem passar pela rota API), reforçar
essa policy com `and auth_role() in ('agencia','admin')`, igual já é feito em `social_accounts`. Deixado como
está porque hoje não há uso direto de client-side writes e mudar a policy é uma decisão de arquitetura
(pode quebrar fluxos que o agente de frontend está construindo agora em paralelo).

---

## Achados corrigidos nesta revisão

| # | Severidade | Arquivo | Problema | Correção |
|---|---|---|---|---|
| 1 | **CRÍTICO** | `supabase/migrations/002_rls_policies.sql` (policy `users_update_self`) + `004_triggers.sql` (`sync_user_app_metadata`) | A policy `users_update_self` permite `UPDATE` em qualquer coluna da própria linha, incluindo `role` e `client_id`. Como o trigger `sync_user_app_metadata` propaga essas colunas para `auth.users.raw_app_meta_data` (fonte das claims JWT lidas por toda RLS via `auth_client_id()`/`auth_role()`/`is_admin()`), um usuário `cliente` podia fazer `update users set role='admin'` ou trocar `client_id` para outro tenant e, após refresh de sessão, obter acesso admin/cross-tenant total. | Nova migration `supabase/migrations/003_prevent_privilege_escalation.sql`: trigger `BEFORE UPDATE` em `public.users` que bloqueia mudança de `role`/`client_id` por sessões de usuário não-admin (permite `service_role`/admin). |
| 2 | **MÉDIO** | `app/api/insights/sync/route.ts` | A rota valida apenas role (`agencia`/`admin`), mas dispara a Edge Function `sync-insights` (que roda com `service_role`, ignorando RLS) sem checar se `social_account_id` pertence ao `client_id` do chamador. Um `agencia` de um cliente podia acionar sync de conta social de outro cliente. | Antes de chamar a function, a rota agora busca a conta via cliente RLS-protegido (`createClient()`, não admin) — RLS já filtra por `client_id`, então se não encontrar (404), a request é rejeitada antes de tocar o `service_role`. |
| 3 | **BAIXO** | `app/api/clients/[id]/route.ts` (`GET`) | Faltava chamada a `requireAuth()` — a rota dependia só de RLS para bloquear acesso não autenticado (RLS de fato bloqueava, já que sem JWT `auth_client_id()` é `null`, então não corresponderia a nenhum `id`; mas a rota não seguia o padrão de defesa em profundidade das demais). | Adicionado `requireAuth()` no início do handler, no mesmo padrão das outras rotas. |
| 4 | **BAIXO** (defesa em profundidade) | `app/api/users/[id]/route.ts` (`PATCH`) | O body do `PATCH` era passado inteiro para `update()`, incluindo potencialmente `role`/`client_id` — hoje bloqueado pela migration 003, mas a rota não reforçava isso. | `role` e `client_id` agora são explicitamente removidos do body antes do update. |

---

## Itens do checklist confirmados como corretos (sem alteração necessária)

- **Feedback cross-tenant (item 1 do checklist):** `video_feedback_write_same_client` e
  `carousel_feedback_write_same_client` (insert) exigem `exists (select 1 from content_items ci where
  ci.id = content_item_id and ci.client_id = auth_client_id())` — um `cliente` **não** consegue inserir
  feedback em `content_item_id` de outro cliente; a policy bloqueia corretamente mesmo que a rota de API
  não valide isso explicitamente (`app/api/feedback/video/route.ts` e `.../carousel/route.ts` fazem apenas
  `requireAuth()` + insert, confiando na RLS — o que é seguro aqui porque o insert usa o client RLS-protegido,
  nunca `admin.ts`).
- **Todas as tabelas tenant-aware têm RLS habilitada** (`alter table ... enable row level security` presente
  para `clients`, `users`, `social_accounts`, `content_items`, `video_feedback`, `carousel_feedback`,
  `insights_snapshots`, `agent_tasks`, `agent_runs`).
- **`requireAuth()`/`requireRole()` em `app/api/**`:** todas as rotas exceto `clients/[id]` `GET` (corrigido
  acima) e as rotas públicas por natureza (`/api/auth/signin` — login, `/api/auth/callback` — já protegida por
  `requireRole`) chamam `requireAuth()`/`requireRole()` antes de tocar dados.
- **`lib/supabase/admin.ts` (service_role):** não é usado em nenhuma rota `app/api/**` no momento da revisão —
  só está definido, pronto para uso futuro (edge functions já o usam, ver achado #1 acima sobre essas).
- **Segredos:** `.env.example` só tem placeholders vazios (`CHAVE=`); `.gitignore` cobre `.env` e `.env*.local`;
  `git log --all --full-history -- .env .env.local` não retornou nenhum commit; `git ls-files | grep env` só
  lista `.env.example`.
- **Upload de mídia:** nenhum endpoint de upload existe ainda neste worktree (`grep` por `upload|storage\.from`
  em `app/` não encontrou nada) — item 5 do checklist não se aplica nesta rodada; deve ser revisado quando o
  agente de storage/notificações adicionar o endpoint.
