import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import type { UserOption } from "@/components/pipeline/ProspectForm";

export default async function PipelinePage() {
  const supabase = await createClient();

  const [{ data: usersData }, { data: authData }] = await Promise.all([
    supabase.from("users").select("id, email"),
    supabase.auth.getUser(),
  ]);

  const users = (usersData ?? []) as UserOption[];
  const ownerNameById = new Map(users.map((u) => [u.id, u.email]));

  return (
    <PipelineBoard users={users} ownerNameById={ownerNameById} currentUserId={authData.user?.id} />
  );
}
