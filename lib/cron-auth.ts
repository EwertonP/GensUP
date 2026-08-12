import type { NextRequest } from "next/server";

// Autorização compartilhada por jobs agendados (app/api/publish,
// app/api/agent-worker). Aceita dois formatos de credencial, ambos
// comparados contra process.env.CRON_SECRET:
//   - header x-cron-secret: usado por chamadas manuais/curl e por um
//     eventual Supabase Edge Function + pg_cron (fetch com header custom).
//   - header Authorization: Bearer <CRON_SECRET>: injetado automaticamente
//     pelo Vercel Cron em toda chamada disparada por um schedule definido em
//     vercel.json -- Vercel não permite configurar headers customizados em
//     cron nativo, só esse Bearer.
// Fail-closed: sem CRON_SECRET configurado, nenhuma chamada é autorizada.
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const providedHeaderSecret = req.headers.get("x-cron-secret");
  if (providedHeaderSecret === cronSecret) return true;

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}
