import { ProspectCard } from "@/components/pipeline/ProspectCard";
import type { Prospect } from "@/lib/types/crm";

interface PipelineColumnProps {
  label: string;
  muted?: boolean;
  prospects: Prospect[];
  ownerNameById: Map<string, string>;
}

export function PipelineColumn({ label, muted, prospects, ownerNameById }: PipelineColumnProps) {
  return (
    <div className="min-w-[220px] rounded-lg bg-neutral-100 p-3">
      <h3 className={`mb-2 text-xs font-semibold uppercase ${muted ? "text-neutral-400" : "text-neutral-500"}`}>
        {label} <span className="text-neutral-400">({prospects.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {prospects.map((prospect) => (
          <ProspectCard
            key={prospect.id}
            prospect={prospect}
            ownerName={prospect.owner_user_id ? (ownerNameById.get(prospect.owner_user_id) ?? null) : null}
          />
        ))}
      </div>
    </div>
  );
}
