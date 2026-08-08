import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET() {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase.from("content_items").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    if (ctx.role !== "agencia" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Apenas agência pode criar conteúdo" }, { status: 403 });
    }
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_items")
      .insert({ ...body, client_id: ctx.clientId, created_by: ctx.userId })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
