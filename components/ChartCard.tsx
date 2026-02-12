export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--k-gray-200)] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--k-gray-900)]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--k-gray-500)]">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
