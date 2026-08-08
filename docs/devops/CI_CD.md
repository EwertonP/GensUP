# CI/CD

## Workflows

### `.github/workflows/build-and-test.yml`
Roda em todo push e PR para `main`, `staging` e `develop`. Passos: install → type-check → lint → build → test. Usa `--if-present` para não quebrar antes desses scripts existirem no `package.json` (Front-end ainda vai criá-los).

### `.github/workflows/deploy-staging.yml`
Dispara em push para `staging`. Faz build e `vercel deploy` (preview/staging) usando `VERCEL_TOKEN`.

### `.github/workflows/deploy-prod.yml`
Dispara em push para `main`. Faz build e `vercel deploy --prod`.

## Branch strategy

| Branch | Propósito | Deploy |
|---|---|---|
| `develop` | Integração de features via PR | Nenhum (só CI) |
| `staging` | Homologação | Automático → Staging |
| `main` | Produção | Automático → Produção |
| `feature/*` | Trabalho individual, PR para `develop` | Preview (Vercel, via integração GitHub) |

## Branch protection (`main`)

Configurar em GitHub → Settings → Branches → Add rule para `main`:
- Require pull request before merging (1+ aprovação)
- Require status checks to pass (`build-and-test`)
- Require branches to be up to date before merging

## Secrets necessários (GitHub → Settings → Secrets and variables → Actions)

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Ver [ENV_VARS.md](./ENV_VARS.md) para a lista completa.

## Pré-requisito atual

O `package.json` do projeto Next.js ainda não existe (responsabilidade do Front-end). Até lá, `npm ci` no workflow falhará — isso é esperado na Fase 0 enquanto as equipes trabalham em paralelo. Assim que o scaffold do Front-end for commitado, os workflows passam a rodar de verdade.
