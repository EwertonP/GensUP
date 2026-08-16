import { requireAuth } from "@/lib/auth/middleware";
import { ClientsBoard } from "@/components/clients/ClientsBoard";

export default async function ClientsPage() {
  // Criação manual (POST /api/clients) é restrita a role=admin -- o botão só
  // aparece pra quem realmente consegue usar a ação, evitando 403 silencioso.
  const { role } = await requireAuth();
  return <ClientsBoard canCreate={role === "admin"} />;
}
