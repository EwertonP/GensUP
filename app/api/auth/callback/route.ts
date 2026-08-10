import { NextRequest, NextResponse } from "next/server";

// Rota legada: a implementação real do callback OAuth Meta agora vive em
// /api/auth/instagram/callback (ver lib/meta-api/index.ts). Mantida apenas
// como redirect 307 (preserva método + querystring) para não quebrar um
// META_REDIRECT_URI já configurado no Meta App Dashboard apontando para cá.
export async function GET(req: NextRequest) {
  const target = new URL("/api/auth/instagram/callback", req.nextUrl.origin);
  target.search = req.nextUrl.search;
  return NextResponse.redirect(target, 307);
}
