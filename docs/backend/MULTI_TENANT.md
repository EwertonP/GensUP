# Multi-tenant: como o isolamento funciona

## Modelo
Cada cliente da agência é um tenant, identificado por `clients.id`. Toda tabela que armazena dados de negócio tem `client_id` direto ou via FK para uma tabela que tem `client_id` (ex: `video_feedback` → `content_items.client_id`).

## Fluxo de autenticação
1. Usuário se registra via `supabase.auth.signUp`, passando `client_id` e `role` em `options.data`.
2. Trigger `handle_new_user` (`004_triggers.sql`) cria a linha em `public.users`.
3. Trigger `sync_user_app_metadata` copia `client_id`/`role` de `public.users` para `auth.users.raw_app_meta_data`.
4. O JWT emitido pelo Supabase Auth passa a conter `app_metadata.client_id` e `app_metadata.role`.
5. RLS lê esses valores via `auth.jwt() -> 'app_metadata'` (helpers `auth_client_id()` / `auth_role()` em `002_rls_policies.sql`).

**Importante:** `app_metadata` só é atualizado no JWT após o token ser reemitido (refresh ou novo login). Se o `client_id`/`role` de um usuário mudar, force um refresh de sessão no client.

## Camadas de isolamento
1. **RLS (obrigatória):** toda tabela tem `select`/`write` filtrado por `client_id = auth_client_id()`, exceto para `role = admin`.
2. **Rotas de API (defesa em profundidade + regra de negócio):** `lib/auth/middleware.ts` extrai `clientId`/`role` do usuário autenticado e:
   - nunca aceita `client_id` vindo do body em operações de escrita — sempre usa o do contexto autenticado;
   - aplica regras de role que RLS não expressa bem (ex: máquina de estados de `content_items.status`).

## Roles
| Role | Pode |
|---|---|
| `cliente` | Ver conteúdo do próprio `client_id`, comentar, aprovar/pedir ajuste |
| `agencia` | CRUD de conteúdo do próprio `client_id`, gerenciar contas sociais, disparar sync |
| `admin` | Acesso total, cross-tenant |

## Service role (Edge Functions)
Edge Functions usam a `service_role` key (`lib/supabase/admin.ts`), que ignora RLS. Toda função que roda com esse client deve filtrar `client_id` manualmente na query — RLS não protege aqui.

## Máquina de estados de `content_items.status`
`draft → in_review → (changes_requested | approved) → scheduled → published`
Definida em `app/api/content-items/[id]/status/route.ts`, com transições e roles permitidas por status.
