import { createClient } from "@/lib/supabase/server";
import { ActivitiesLog, type ActivityLogEntry } from "@/components/activities/ActivitiesLog";

const ACTIVITIES_LIMIT = 200;

export default async function ActivitiesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("id, type, body, created_at, prospect_id, client_id, prospects(name), clients(name), users(email)")
    .order("created_at", { ascending: false })
    .limit(ACTIVITIES_LIMIT);

  const entries: ActivityLogEntry[] = (data ?? []).map((row) => {
    const prospect = row.prospects as unknown as { name?: string } | null;
    const client = row.clients as unknown as { name?: string } | null;
    const author = row.users as unknown as { email?: string } | null;

    return {
      id: row.id,
      type: row.type,
      body: row.body,
      created_at: row.created_at,
      prospect_id: row.prospect_id,
      client_id: row.client_id,
      targetName: prospect?.name ?? client?.name ?? "—",
      targetHref: row.client_id ? `/clients/${row.client_id}` : row.prospect_id ? `/pipeline/${row.prospect_id}` : null,
      authorEmail: author?.email ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Atividades</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Log unificado de interações com prospects e clientes — últimas {ACTIVITIES_LIMIT}.
        </p>
      </div>

      {error && <p className="text-sm text-status-error">Erro ao carregar atividades: {error.message}</p>}

      {!error && <ActivitiesLog entries={entries} />}
    </div>
  );
}
