import { StageBadge } from "@/components/pipeline/StageBadge";
import { SourceBadge } from "@/components/pipeline/SourceBadge";
import type { Prospect } from "@/lib/types/crm";

export function ProspectHeader({ prospect, ownerName }: { prospect: Prospect; ownerName: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">{prospect.name}</h1>
          <p className="text-sm text-neutral-500">{prospect.company}</p>
        </div>
        <StageBadge stage={prospect.stage} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={prospect.source} />
        <span className="text-xs text-neutral-400">Dono: {ownerName ?? "—"}</span>
      </div>
    </div>
  );
}
