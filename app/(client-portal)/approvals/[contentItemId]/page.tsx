export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ contentItemId: string }>;
}) {
  const { contentItemId } = await params;
  return <h1 className="text-xl font-semibold">Aprovação — {contentItemId}</h1>;
}
