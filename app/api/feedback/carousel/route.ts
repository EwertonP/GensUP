import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const contentItemId = req.nextUrl.searchParams.get("content_item_id");
    if (!contentItemId) return NextResponse.json({ error: "content_item_id é obrigatório" }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("carousel_feedback")
      .select("*")
      .eq("content_item_id", contentItemId)
      .order("page_number", { ascending: true });
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
    const body = await req.json();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("carousel_feedback")
      .insert({ ...body, created_by: ctx.userId })
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
