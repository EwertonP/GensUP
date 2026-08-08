import { createClient } from "@/lib/supabase/server";
import type { Role } from "./roles";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export interface AuthContext {
  userId: string;
  clientId: string | null;
  role: Role;
}

// Valida a sessão e extrai client_id/role do app_metadata do JWT.
// RLS já filtra os dados no banco; isso é a checagem de rota (fail-fast, mensagens melhores).
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Sessão inválida ou expirada");
  }

  const appMetadata = user.app_metadata as { client_id?: string; role?: Role };

  if (!appMetadata.role) {
    throw new ForbiddenError("Usuário sem role definida");
  }

  return {
    userId: user.id,
    clientId: appMetadata.client_id ?? null,
    role: appMetadata.role,
  };
}

export async function requireRole(allowed: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!allowed.includes(ctx.role)) {
    throw new ForbiddenError(`Requer role: ${allowed.join(", ")}`);
  }
  return ctx;
}
