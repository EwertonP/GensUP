# Deploy

## Automático

- Push/merge em `staging` → deploy automático para Staging (Vercel), via `.github/workflows/deploy-staging.yml`
- Push/merge em `main` → deploy automático para Produção (Vercel), via `.github/workflows/deploy-prod.yml`
- Pull Requests → Vercel cria um Preview Deployment automaticamente (integração nativa GitHub↔Vercel, não depende dos workflows)

## Manual (local)

```bash
npm install -g vercel
vercel login
vercel link          # conecta a pasta ao projeto Vercel
vercel                # deploy de preview
vercel --prod          # deploy direto para produção
```

## Rollback

1. **Vercel:** Dashboard → Deployments → selecionar deployment anterior → "Promote to Production" (instantâneo, sem rebuild)
2. **Database:** Supabase Dashboard → Database → Backups → restore
3. **Git:** `git revert <commit>` e push para `main` (gera novo deploy correto)

## Setup inicial (uma vez)

1. Criar projeto em https://vercel.com/new e conectar ao repositório GitHub
2. Rodar `vercel link` localmente para obter `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` (aparecem em `.vercel/project.json`)
3. Gerar um token em https://vercel.com/account/tokens
4. Adicionar `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` como GitHub Secrets
5. Adicionar as variáveis de `.env.example` no dashboard Vercel (Settings → Environment Variables)
