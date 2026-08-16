import { EditorialCalendar } from "@/components/content/EditorialCalendar";

export default async function ContentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) - 1 : now.getMonth();

  return <EditorialCalendar year={year} month={month} />;
}
