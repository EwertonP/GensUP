import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

const BUCKET = "content-media";

// Caracteres seguros para nome de arquivo (evita path traversal / segmentos extras)
function sanitizeFilename(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-200) || "arquivo";
}

// POST /api/content-items/[id]/upload
// Gera uma signed URL de upload para o arquivo (vídeo ou imagem de carrossel)
// do content item. Apenas agência/admin podem subir mídia. O path do objeto
// segue o padrão {client_id}/{content_item_id}/{filename}, que é o mesmo
// validado pelas políticas de storage em 003_storage.sql.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (ctx.role !== "agencia" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Apenas agência pode enviar mídia" }, { status: 403 });
    }
    if (!ctx.clientId && ctx.role !== "admin") {
      return NextResponse.json({ error: "Usuário sem client_id associado" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { filename?: string };
    const filename = body.filename ? sanitizeFilename(body.filename) : `${Date.now()}`;

    const supabase = await createClient();

    // Confirma que o content_item existe e pertence ao client_id do usuário
    // (RLS já garante isso, mas validamos aqui para responder 404 claro).
    const { data: item, error: fetchError } = await supabase
      .from("content_items")
      .select("id, client_id")
      .eq("id", id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Content item não encontrado" }, { status: 404 });
    }

    const objectPath = `${item.client_id}/${item.id}/${filename}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      path: objectPath,
      token: data.token,
      signedUrl: data.signedUrl,
      bucket: BUCKET,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
