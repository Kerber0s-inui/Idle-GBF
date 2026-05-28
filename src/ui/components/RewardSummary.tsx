import type { RewardStack } from '../../domain/rewards';

type RewardSummaryProps = {
  rewards: RewardStack[];
};

export function RewardSummary({ rewards }: RewardSummaryProps) {
  if (rewards.length === 0) {
    return <p className="reward-list empty">暂无奖励</p>;
  }

  return (
    <ul className="reward-list">
      {rewards.map((reward) => (
        <li key={`${reward.kind}-${reward.itemId}`}>
          <span>{reward.itemId}</span>
          <strong>x{reward.quantity}</strong>
        </li>
      ))}
    </ul>
  );
}
