"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 1500);
  }

  if (status === "error") {
    return <span className="text-xs text-status-error">Não foi possível copiar</span>;
  }

  return (
    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={handleCopy}>
      {status === "copied" ? "Copiado!" : "Copiar"}
    </Button>
  );
}
