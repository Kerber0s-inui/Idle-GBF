type IconBadgeProps = {
  label: string;
};

export function IconBadge({ label }: IconBadgeProps) {
  const first = label.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span aria-hidden="true" className="icon-badge">
      {first}
    </span>
  );
}
