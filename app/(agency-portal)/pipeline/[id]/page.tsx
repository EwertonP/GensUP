import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProspectHeader } from "@/components/pipeline/ProspectHeader";
import { ActivityTimeline } from "@/components/activities/ActivityTimeline";
import type { Prospect } from "@/lib/types/crm";

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from("prospects").select("*").eq("id", id).single();

  if (error || !data) {
    notFound();
  }

  const prospect = data as Prospect;

  const { data: usersData } = await supabase.from("users").select("id, email");
  const userNameById = new Map((usersData ?? []).map((u) => [u.id as string, u.email as string]));
  const ownerName = prospect.owner_user_id ? (userNameById.get(prospect.owner_user_id) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <ProspectHeader prospect={prospect} ownerName={ownerName} />
      <ActivityTimeline prospectId={prospect.id} createdByNameById={userNameById} />
    </div>
  );
}
