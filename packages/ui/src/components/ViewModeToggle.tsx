import type { ViewMode } from '../lib/settings';

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const MODES: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'grid',  label: 'Grid',    icon: '▦' },
  { id: 'list',  label: 'List',    icon: '☰' },
  { id: 'group', label: 'Grouped', icon: '⧉' },
];

export function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-ink-400 bg-ink-700 p-0.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          title={m.label}
          className={`px-2.5 py-1 text-xs rounded flex items-center gap-1.5 ${
            value === m.id ? 'bg-accent text-white' : 'text-ink-200 hover:text-ink-100'
          }`}
        >
          <span className="font-mono">{m.icon}</span>
          <span className="hidden xl:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
