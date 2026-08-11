import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, UnauthorizedError, ForbiddenError } from "@/lib/auth/middleware";

// GET /api/reports/monthly?client_id=<uuid>&month=YYYY-MM
//
// Agrega insights_snapshots do client no mês pedido e devolve um PDF binário
// com uma tabela simples de métricas + variação % vs. o mês anterior.
//
// Métricas conhecidas hoje (ver supabase/migrations/007_insights_sync.sql e o
// sync do Instagram): alcance, impressoes, engajamento, visualizacoes_perfil
// são cumulativas por dia (somamos no mês); seguidores é um snapshot pontual
// (usamos a média do mês, que é o valor "resumo" mais razoável sem escolher
// arbitrariamente entre primeiro/último dia).
const SUM_METRICS = new Set(["alcance", "impressoes", "engajamento", "visualizacoes_perfil"]);
const METRIC_LABELS: Record<string, string> = {
  alcance: "Alcance",
  impressoes: "Impressões",
  engajamento: "Engajamento",
  visualizacoes_perfil: "Visualizações de perfil",
  seguidores: "Seguidores",
};
const METRIC_ORDER = ["alcance", "impressoes", "engajamento", "visualizacoes_perfil", "seguidores"];

function parseMonth(month: string | null): { start: Date; end: Date; label: string } | null {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1; // 0-based
  if (monthIdx < 0 || monthIdx > 11) return null;
  const start = new Date(Date.UTC(year, monthIdx, 1));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1)); // exclusivo
  return { start, end, label: month };
}

function previousMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const prevDate = new Date(Date.UTC(year, monthIdx - 1, 1));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonth = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
  return `${prevYear}-${prevMonth}`;
}

function aggregate(rows: { metric: string; value: number }[]): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    sums[row.metric] = (sums[row.metric] ?? 0) + row.value;
    counts[row.metric] = (counts[row.metric] ?? 0) + 1;
  }
  const result: Record<string, number> = {};
  for (const metric of Object.keys(sums)) {
    result[metric] = SUM_METRICS.has(metric) ? sums[metric] : sums[metric] / counts[metric];
  }
  return result;
}

async function fetchMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  socialAccountIds: string[],
  start: Date,
  end: Date
): Promise<Record<string, number>> {
  if (socialAccountIds.length === 0) return {};
  const { data, error } = await supabase
    .from("insights_snapshots")
    .select("metric, value")
    .in("social_account_id", socialAccountIds)
    .gte("snapshot_date", start.toISOString().slice(0, 10))
    .lt("snapshot_date", end.toISOString().slice(0, 10));

  if (error) throw new Error(error.message);
  return aggregate(data ?? []);
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatVariation(current: number, previous: number | undefined): string {
  if (previous === undefined || previous === 0) return "—";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("client_id");
    const month = searchParams.get("month");

    if (!clientId) {
      return NextResponse.json({ error: "client_id é obrigatório" }, { status: 400 });
    }
    const parsedMonth = parseMonth(month);
    if (!parsedMonth) {
      return NextResponse.json({ error: "month inválido — use o formato YYYY-MM" }, { status: 400 });
    }

    // Role cliente só pode pedir relatório do próprio client_id.
    if (ctx.role === "cliente" && ctx.clientId !== clientId) {
      return NextResponse.json({ error: "Você só pode solicitar relatórios do seu próprio client" }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();
    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const { data: socialAccounts, error: accountsError } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("client_id", clientId);
    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 400 });
    }
    const socialAccountIds = (socialAccounts ?? []).map((a) => a.id);

    const currentMetrics = await fetchMetrics(supabase, socialAccountIds, parsedMonth.start, parsedMonth.end);

    if (Object.keys(currentMetrics).length === 0) {
      return NextResponse.json(
        { error: `Sem dados de insights para ${client.name} em ${parsedMonth.label}` },
        { status: 404 }
      );
    }

    const prevMonthLabel = previousMonth(parsedMonth.label);
    const prevParsed = parseMonth(prevMonthLabel)!;
    const previousMetrics = await fetchMetrics(supabase, socialAccountIds, prevParsed.start, prevParsed.end);

    // ---- Gera o PDF ----
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const marginX = 50;

    page.drawText("Relatório Mensal de Insights", { x: marginX, y, size: 18, font: fontBold });
    y -= 28;
    page.drawText(`Cliente: ${client.name}`, { x: marginX, y, size: 12, font });
    y -= 18;
    page.drawText(`Mês de referência: ${parsedMonth.label}`, { x: marginX, y, size: 12, font });
    y -= 36;

    // Cabeçalho da tabela
    const colMetric = marginX;
    const colValue = marginX + 260;
    const colPrev = marginX + 360;
    const colVar = marginX + 460;

    page.drawText("Métrica", { x: colMetric, y, size: 11, font: fontBold });
    page.drawText("Valor", { x: colValue, y, size: 11, font: fontBold });
    page.drawText("Mês anterior", { x: colPrev, y, size: 11, font: fontBold });
    page.drawText("Variação", { x: colVar, y, size: 11, font: fontBold });
    y -= 6;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: 545, y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 18;

    const metricsToShow = METRIC_ORDER.filter((m) => m in currentMetrics);
    for (const metric of metricsToShow) {
      const label = METRIC_LABELS[metric] ?? metric;
      const current = currentMetrics[metric];
      const previous = previousMetrics[metric];

      page.drawText(label, { x: colMetric, y, size: 11, font });
      page.drawText(formatNumber(current), { x: colValue, y, size: 11, font });
      page.drawText(previous !== undefined ? formatNumber(previous) : "—", { x: colPrev, y, size: 11, font });
      page.drawText(formatVariation(current, previous), { x: colVar, y, size: 11, font });
      y -= 20;
    }

    y -= 16;
    page.drawText(
      `Gerado em ${new Date().toLocaleDateString("pt-BR")} — dados agregados de insights_snapshots.`,
      { x: marginX, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) }
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio-${clientId}-${parsedMonth.label}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
