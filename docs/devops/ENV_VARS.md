# Environment Variables

Todas as variáveis usadas pelo projeto. Copie `.env.example` para `.env.local` para desenvolvimento local.

| Variável | Onde é usada | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | App (client + server) | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App (client + server) | Chave anônima (pública) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | App (server only) | Chave admin do Supabase — nunca expor no client |
| `NEXT_PUBLIC_META_APP_ID` | App (client) | App ID do Meta Graph API (OAuth) |
| `META_APP_ID` | App (server) | App ID do Meta Graph API (chamadas server-side) |
| `META_APP_SECRET` | App (server only) | Secret do Meta App — nunca expor no client |
| `RESEND_API_KEY` | App (server only) | Envio de emails/notificações via Resend |
| `VERCEL_TOKEN` | GitHub Actions | Token de deploy usado nos workflows |
| `VERCEL_ORG_ID` | GitHub Actions | ID da organização Vercel |
| `VERCEL_PROJECT_ID` | GitHub Actions | ID do projeto Vercel |

## Onde configurar

- **Local:** `.env.local` (nunca commitar — já está no `.gitignore` padrão do Next.js)
- **Vercel:** Dashboard do projeto → Settings → Environment Variables (marcar como Encrypted). Configurar para os ambientes Production, Preview e Development conforme necessário.
- **GitHub Actions:** Settings → Secrets and variables → Actions → New repository secret. Necessário para `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Regras

- Nunca commitar `.env.local` ou qualquer arquivo com valores reais.
- Variáveis `NEXT_PUBLIC_*` são expostas no bundle do client — nunca colocar segredos nelas.
- `SUPABASE_SERVICE_ROLE_KEY` e `META_APP_SECRET` são server-only.
