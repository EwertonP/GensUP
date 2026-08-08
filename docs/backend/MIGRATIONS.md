# Guia de Migrations

## Estrutura
```
supabase/migrations/
├── 001_schema.sql        # Tabelas + índices
├── 002_rls_policies.sql  # RLS + helpers de JWT
└── 004_triggers.sql      # Trigger de profile + sync de app_metadata
```
Numeração deixa espaço (003) para functions Postgres futuras sem renumerar.

## Rodando localmente
```bash
npx supabase init          # uma vez, se ainda não existir supabase/config.toml
npx supabase start         # sobe Postgres local + Studio
npx supabase db reset      # aplica todas as migrations do zero
```

## Criando uma nova migration
```bash
npx supabase migration new nome_da_mudanca
# edita o arquivo gerado em supabase/migrations/
npx supabase db reset      # valida localmente antes de commitar
```

## Aplicando em produção
```bash
npx supabase link --project-ref [PROJECT_ID]
npx supabase db push
```
Sempre validar `db reset` local com sucesso antes de `db push` em produção. Nunca editar uma migration já aplicada em produção — criar uma nova.

## Gerando tipos TypeScript (para o Front-end)
```bash
npx supabase gen types typescript --project-id [SEU_ID] > lib/supabase/types.ts
```
Rodar após qualquer mudança em `001_schema.sql` e repassar ao time de Front-end.

## Regras
- RLS deve ser habilitada na mesma migration (ou logo em seguida) em que a tabela é criada — nunca deixar uma tabela sem RLS em produção.
- Toda tabela de negócio precisa de `client_id` direto ou FK para tabela com `client_id` (ver `MULTI_TENANT.md`).
