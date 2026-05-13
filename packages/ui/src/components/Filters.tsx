import type { ToolKind } from '../types';

const KINDS: { id: ToolKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai-cli', label: 'AI' },
  { id: 'runtime', label: 'Runtimes' },
  { id: 'pkg-manager', label: 'Pkg mgrs' },
  { id: 'dev-cli', label: 'Dev / Cloud' },
  { id: 'service', label: 'Services' },
  { id: 'util', label: 'Utilities' },
  { id: 'app', label: 'Apps' },
];

const FILTERS: { id: 'all' | 'installed' | 'missing' | 'running'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'installed', label: 'Installed' },
  { id: 'missing', label: 'Missing' },
  { id: 'running', label: 'Running' },
];

interface Props {
  search: string;
  onSearch: (s: string) => void;
  kind: ToolKind | 'all';
  onKind: (k: ToolKind | 'all') => void;
  filter: 'all' | 'installed' | 'missing' | 'running';
  onFilter: (f: 'all' | 'installed' | 'missing' | 'running') => void;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

export function Filters({ search, onSearch, kind, onKind, filter, onFilter, inputRef }: Props) {
  return (
    <div className="px-6 pb-3 flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search by name, tag, use case… (press / to focus)"
        className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-sm placeholder:text-ink-300 focus:outline-none focus:border-accent"
      />
      <div className="flex gap-1 text-xs">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => onKind(k.id)}
            className={`px-2.5 py-1 rounded-md border ${
              kind === k.id
                ? 'bg-accent text-white border-accent'
                : 'bg-ink-700 border-ink-600 text-ink-100 hover:border-ink-400'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 text-xs">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilter(f.id)}
            className={`px-2.5 py-1 rounded-md border ${
              filter === f.id
                ? 'bg-ink-600 border-ink-400 text-ink-100'
                : 'bg-ink-700 border-ink-600 text-ink-200 hover:border-ink-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
