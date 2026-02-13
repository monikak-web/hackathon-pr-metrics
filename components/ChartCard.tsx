export function ChartCard({
  title,
  description,
  children,
  className,
  compact,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const padding = compact ? "p-3" : "p-6";
  const contentMt = compact ? "mt-1" : "mt-4";
  const titleSize = compact ? "text-base" : "text-lg";
  const descMt = compact ? "mt-0.5" : "mt-1";
  return (
    <div className={`rounded-xl border border-[var(--k-gray-200)] bg-white ${padding} shadow-sm ${className ?? ""}`}>
      <h2 className={`${titleSize} font-semibold text-[var(--k-gray-900)]`}>
        {title}
      </h2>
      <p className={`${descMt} text-sm text-[var(--k-gray-500)]`}>{description}</p>
      <div className={contentMt}>{children}</div>
    </div>
  );
}
