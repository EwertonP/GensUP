import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

const BUCKET = "content-media";
const SIGNED_URL_TTL_SECONDS = 3600;

export interface MediaAsset {
  path: string;
  contentItemId: string;
  filename: string;
  size: number | null;
  updatedAt: string | null;
  signedUrl: string | null;
}

// GET /api/content-media?client_id=... -- lista objetos direto do bucket
// content-media (design/INFORMATION_ARCHITECTURE.md seção 3.3, decisão: sem
// tabela nova). Path segue {client_id}/{content_item_id}/{filename}
// (ver 005_storage.sql), então listamos em dois níveis.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const requestedClientId = req.nextUrl.searchParams.get("client_id");
    const clientId = ctx.role === "cliente" ? ctx.clientId : requestedClientId;

    if (!clientId) {
      return NextResponse.json({ error: "client_id é obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: folders, error: foldersError } = await supabase.storage.from(BUCKET).list(clientId);
    if (foldersError) return NextResponse.json({ error: foldersError.message }, { status: 400 });

    const assets: MediaAsset[] = [];

    for (const folder of folders ?? []) {
      // Entradas com id=null no retorno do Storage são "pastas" (prefixos), não arquivos.
      if (folder.id !== null) continue;
      const contentItemId = folder.name;
      const { data: files, error: filesError } = await supabase.storage
        .from(BUCKET)
        .list(`${clientId}/${contentItemId}`);
      if (filesError || !files) continue;

      for (const file of files) {
        if (file.id === null) continue; // subpasta inesperada, ignora
        const path = `${clientId}/${contentItemId}/${file.name}`;
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        assets.push({
          path,
          contentItemId,
          filename: file.name,
          size: (file.metadata as { size?: number } | null)?.size ?? null,
          updatedAt: file.updated_at ?? null,
          signedUrl: signed?.signedUrl ?? null,
        });
      }
    }

    assets.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

    return NextResponse.json(assets);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
