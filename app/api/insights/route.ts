import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const socialAccountId = req.nextUrl.searchParams.get("social_account_id");
    if (!socialAccountId) return NextResponse.json({ error: "social_account_id é obrigatório" }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("insights_snapshots")
      .select("*")
      .eq("social_account_id", socialAccountId)
      .order("snapshot_date", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
