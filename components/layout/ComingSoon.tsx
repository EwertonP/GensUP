export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
      <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {description ?? "Esta seção ainda está em construção."}
      </p>
    </div>
  );
}
