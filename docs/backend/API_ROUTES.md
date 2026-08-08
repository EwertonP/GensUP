# API Routes

Todas as rotas exigem sessão autenticada (cookie do Supabase Auth), salvo indicação contrária. RLS filtra os dados por `client_id` em todas as queries; as rotas fazem checagens adicionais de role para regras de negócio.

## Clients
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/clients` | agencia, admin | Lista clientes visíveis |
| POST | `/api/clients` | admin | Cria cliente |
| GET | `/api/clients/[id]` | qualquer autenticado | Detalhe (RLS filtra) |
| PATCH | `/api/clients/[id]` | admin | Atualiza cliente |
| DELETE | `/api/clients/[id]` | admin | Remove cliente |

## Users
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/users` | qualquer autenticado | Lista usuários do próprio client_id |
| GET | `/api/users/[id]` | qualquer autenticado | Detalhe |
| PATCH | `/api/users/[id]` | próprio usuário ou admin | Atualiza profile |
| DELETE | `/api/users/[id]` | admin | Remove usuário |

Criação de usuário é feita via `supabase.auth.signUp` no client — o trigger `handle_new_user` cria o profile em `public.users` automaticamente.

## Social Accounts
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/social-accounts` | qualquer autenticado | Lista contas (sem `access_token`) |
| POST | `/api/social-accounts` | agencia, admin | Cadastro manual (fora do fluxo OAuth) |
| GET | `/api/auth/callback` | agencia, admin | Callback OAuth Meta — pendente de credenciais |

## Content Items
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/content-items` | qualquer autenticado | Lista itens |
| POST | `/api/content-items` | agencia, admin | Cria item (status inicial `draft`) |
| GET | `/api/content-items/[id]` | qualquer autenticado | Detalhe |
| PATCH | `/api/content-items/[id]` | agencia, admin | Atualiza campos (exceto status — ver abaixo) |
| PATCH | `/api/content-items/[id]/status` | varia por transição | Máquina de estados (ver `MULTI_TENANT.md`) |

## Feedback
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/feedback/video?content_item_id=` | qualquer autenticado | Lista comentários por timestamp |
| POST | `/api/feedback/video` | qualquer autenticado | Cria comentário |
| GET | `/api/feedback/carousel?content_item_id=` | qualquer autenticado | Lista comentários por página |
| POST | `/api/feedback/carousel` | qualquer autenticado | Cria comentário |

## Insights
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/insights?social_account_id=` | qualquer autenticado | Lista snapshots |
| POST | `/api/insights/sync` | agencia, admin | Aciona a Edge Function `sync-insights` |

## Agent Tasks
| Método | Rota | Role | Descrição |
|---|---|---|---|
| GET | `/api/agent-tasks` | qualquer autenticado | Lista tarefas do agente |
| POST | `/api/agent-tasks` | agencia, admin | Enfileira tarefa (status `pending`) |

## Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/signin` | Login com email/senha |
| GET | `/api/auth/callback` | Callback OAuth Meta |

## Convenções
- Erros: `401` (sem sessão), `403` (sem permissão de role), `400` (validação/erro do Supabase), `404` (não encontrado).
- Toda rota que grava dados usa `client_id` do contexto autenticado (`requireAuth`/`requireRole`), nunca vindo do body — evita spoofing de tenant.
