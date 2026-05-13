interface Props {
  label: string;
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  danger?: boolean;
  ghost?: boolean;
}

export function ActionButton({ label, onClick, pending, disabled, danger, ghost }: Props) {
  const base = 'px-3 py-1.5 text-sm rounded-md border transition disabled:opacity-40 disabled:cursor-not-allowed';
  const style = ghost
    ? 'bg-transparent border-ink-600 text-ink-100 hover:border-ink-400'
    : danger
    ? 'bg-accent-bad/15 border-accent-bad/40 text-accent-bad hover:bg-accent-bad/20'
    : 'bg-ink-700 border-ink-600 text-ink-100 hover:border-accent';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${style}`}
    >
      {pending ? '…' : label}
    </button>
  );
}
