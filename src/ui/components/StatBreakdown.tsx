export type StatBreakdownRow = {
  label: string;
  value: string | number;
};

type StatBreakdownProps = {
  rows: StatBreakdownRow[];
};

export function StatBreakdown({ rows }: StatBreakdownProps) {
  return (
    <dl className="stat-breakdown">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
