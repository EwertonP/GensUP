import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/middleware";
import { ProfileSettings } from "@/components/settings/ProfileSettings";

export default async function SettingsProfilePage() {
  const { role, clientId } = await requireAuth();
  const supabase = await createClient();

  const [{ data: authData }, clientResult] = await Promise.all([
    supabase.auth.getUser(),
    clientId ? supabase.from("clients").select("name").eq("id", clientId).single() : Promise.resolve({ data: null }),
  ]);

  return (
    <ProfileSettings email={authData.user?.email ?? "—"} role={role} clientName={clientResult.data?.name ?? null} />
  );
}
