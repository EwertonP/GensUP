# Contributing

## Branches

- `main` — produção, protegida, só via PR aprovado
- `staging` — homologação
- `develop` — integração, base para PRs de feature
- `feature/<nome>` — trabalho individual, PR para `develop`

## Fluxo de PR

1. Crie a branch a partir de `develop`: `git checkout -b feature/minha-feature develop`
2. Commits pequenos e descritivos
3. Antes de abrir o PR, rode localmente:
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```
4. Abra o PR para `develop` — o workflow `build-and-test` precisa passar
5. Peça revisão (1+ aprovação obrigatória para merge em `main`)

## Commits

Prefira mensagens no formato `tipo: descrição curta` (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

## Variáveis de ambiente

Nunca commitar `.env.local`. Ver `docs/devops/ENV_VARS.md` para a lista completa e onde configurar cada uma.
