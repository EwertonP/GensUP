# Troubleshooting

## `npm ci` falha no CI com "no package-lock.json found"
O scaffold Next.js (Front-end) ainda não foi commitado. Rode `npm install` localmente após o scaffold existir para gerar o lockfile e commit ambos.

## Build falha no Vercel mas passa localmente
- Confirme que as env vars do Vercel (Production/Preview) batem com `.env.example`
- Confirme a versão do Node em Vercel Settings → General → Node.js Version (usar a mesma do workflow: 20)

## Deploy falha com erro de autenticação Vercel
- `VERCEL_TOKEN` expirado ou ausente nos GitHub Secrets — gerar novo em https://vercel.com/account/tokens
- Confirme `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` corretos (rodar `vercel link` local e checar `.vercel/project.json`)

## RLS bloqueando queries no Supabase
Ver `docs/backend/MULTI_TENANT.md` — políticas são por `client_id`; confirme que o JWT tem o claim esperado.

## Migrations não aplicam em preview/staging
Confirme que `supabase link` foi feito para o projeto correto e que `supabase db push` está apontando para o ambiente certo (dev/staging/prod têm projetos Supabase separados).
