import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// POST /api/prospects/[id]/convert -- converte um prospect em client.
//
// Idempotente por design: se prospects.converted_client_id ja estiver preenchido
// (conversao anterior), retorna o client existente em vez de criar um duplicado.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["agencia", "admin"]);
    const { id } = await params;
    const supabase = await createClient();

    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

    if (prospect.converted_client_id) {
      const { data: existingClient, error: existingClientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", prospect.converted_client_id)
        .single();
      if (existingClientError) {
        return NextResponse.json({ error: existingClientError.message }, { status: 400 });
      }
      return NextResponse.json({ client: existingClient, prospect, already_converted: true });
    }

    const { data: newClient, error: createClientError } = await supabase
      .from("clients")
      .insert({ name: prospect.company || prospect.name, status: "active" })
      .select()
      .single();

    if (createClientError) {
      return NextResponse.json({ error: createClientError.message }, { status: 400 });
    }

    const { data: updatedProspect, error: updateError } = await supabase
      .from("prospects")
      .update({ stage: "fechado", converted_client_id: newClient.id })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Client criado (${newClient.id}) mas falhou ao atualizar prospect: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ client: newClient, prospect: updatedProspect, already_converted: false }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
