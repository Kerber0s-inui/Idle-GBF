import type { BattleEvent } from '../../domain/battle';

type BattleLogProps = {
  lines?: string[];
  events?: BattleEvent[];
};

function formatSnapshot(event: BattleEvent) {
  const actor = event.snapshot?.actor;
  const boss = event.snapshot?.boss;
  const target = event.snapshot?.target;
  const primary = actor ?? boss;
  const secondary = event.phase === 'player' ? boss : target;
  const parts = [
    primary ? `${primary.name} HP ${primary.hp}/${primary.maxHp ?? primary.hp} ATK ${primary.atk} DEF ${primary.defense}` : '',
    primary?.charge !== undefined ? `奥义槽/豆 ${primary.charge}` : '',
    secondary ? `${secondary.name} HP ${secondary.hp}/${secondary.maxHp ?? secondary.hp}` : '',
  ].filter(Boolean);

  return parts.join(' | ');
}

export function BattleLog({ lines = [], events = [] }: BattleLogProps) {
  if (lines.length === 0 && events.length === 0) return null;

  return (
    <ol className="log-list">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
      {events.map((event, index) => (
        <li key={`${event.kind}-${event.actor}-${index}`}>
          <span>{event.message ?? `${event.actor} ${event.label} ${event.damage ?? ''}`}</span>
          {event.snapshot ? (
            <details>
              <summary>展开</summary>
              <p>{formatSnapshot(event)}</p>
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
