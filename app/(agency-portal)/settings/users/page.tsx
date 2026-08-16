import { requireAuth } from "@/lib/auth/middleware";
import { UsersManager } from "@/components/settings/UsersManager";

// Gestão de usuários (convidar/editar role/desativar) usa endpoints
// admin-only (POST /api/users/invite, PATCH .../ban) -- staff agencia
// não-admin só teria uma tela cheia de botões que sempre falham com 403.
export default async function SettingsUsersPage() {
  const { role } = await requireAuth();

  if (role !== "admin") {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Usuários da agência</h1>
        <p className="mt-2 text-sm text-neutral-500">Só administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return <UsersManager />;
}
