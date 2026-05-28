type BattleLogProps = {
  lines: string[];
};

export function BattleLog({ lines }: BattleLogProps) {
  if (lines.length === 0) return null;

  return (
    <ol className="log-list">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
    </ol>
  );
}
