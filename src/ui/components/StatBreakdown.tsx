export type StatBreakdownRow = {
  label: string;
  value: string | number;
};

type StatBreakdownProps = {
  className?: string;
  rows: StatBreakdownRow[];
};

export function StatBreakdown({ className, rows }: StatBreakdownProps) {
  return (
    <dl className={className ? `stat-breakdown ${className}` : 'stat-breakdown'}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
