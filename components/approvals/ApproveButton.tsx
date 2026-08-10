"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface ApproveButtonProps {
  contentItemId: string;
  disabled?: boolean;
}

export function ApproveButton({ contentItemId, disabled }: ApproveButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/content-items/${contentItemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao aprovar conteúdo");
      }
      setApproved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao aprovar conteúdo");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleApprove} disabled={disabled || pending || approved}>
        {approved ? "Aprovado ✓" : pending ? "Aprovando..." : "Aprovar"}
      </Button>
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  );
}
