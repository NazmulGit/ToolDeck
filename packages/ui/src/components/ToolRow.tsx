import { fmtBytes, fmtCpu, fmtMs } from '../lib/format';
import type { SortDir, SortKey } from '../lib/settings';
import type { ToolView } from '../types';
import { KindBadge } from './KindBadge';
import { StatusDot } from './StatusDot';

interface Props {
  tool: ToolView;
  selected: boolean;
  onClick: () => void;
}

export function ToolRow({ tool, selected, onClick }: Props) {
  const s = tool.status;
  return (
    <button
      onClick={onClick}
      aria-selected={selected}
      className={`w-full text-left px-3 py-2 flex items-center gap-3 border-b border-line-soft ${
        selected ? 'bg-ink-700/70' : 'hover:bg-ink-700/30'
      }`}
    >
      <StatusDot status={s} />
      <div className="w-44 truncate font-medium">{tool.name}</div>
      <KindBadge kind={tool.kind} />
      <div className="hidden md:block flex-1 text-xs text-ink-200 truncate">{tool.description}</div>
      <div className="w-24 text-right text-xs font-mono text-ink-200">{s.installed ? (s.version?.slice(0, 18) || '✓') : '—'}</div>
      <div className="w-20 text-right text-xs font-mono text-ink-200" title="install size">{fmtBytes(s.diskBytes, s.diskCapped)}</div>
      <div className="w-16 text-right text-xs font-mono text-ink-200" title="cpu">{s.running ? fmtCpu(s.metrics?.cpu) : '—'}</div>
      <div className="w-20 text-right text-xs font-mono text-ink-200" title="memory">{s.running ? fmtBytes(s.metrics?.memoryBytes) : '—'}</div>
      <div className="w-20 text-right text-xs font-mono text-ink-200" title="uptime">{s.running ? fmtMs(s.metrics?.uptimeMs) : '—'}</div>
    </button>
  );
}

interface HeaderProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}

interface Col {
  key: SortKey;
  label: string;
  className: string;
  align?: 'left' | 'right';
  hideOnNarrow?: boolean;
}

const COLS: Col[] = [
  { key: 'status',      label: '',            className: 'w-2' },
  { key: 'name',        label: 'Name',        className: 'w-44' },
  { key: 'kind',        label: 'Kind',        className: 'w-[68px]' },
  { key: 'description', label: 'Description', className: 'flex-1', hideOnNarrow: true },
  { key: 'version',     label: 'Version',     className: 'w-24',  align: 'right' },
  { key: 'disk',        label: 'Disk',        className: 'w-20',  align: 'right' },
  { key: 'cpu',         label: 'CPU',         className: 'w-16',  align: 'right' },
  { key: 'memory',      label: 'Memory',      className: 'w-20',  align: 'right' },
  { key: 'uptime',      label: 'Uptime',      className: 'w-20',  align: 'right' },
];

export function ToolRowHeader({ sortKey, sortDir, onSort }: HeaderProps) {
  return (
    <div
      role="row"
      className="sticky top-0 z-10 px-3 py-2 flex items-center gap-3 border-b border-line bg-ink-800/95 backdrop-blur"
    >
      {COLS.map((c) => {
        const active = sortKey === c.key && !!sortDir;
        const ariaSort: 'ascending' | 'descending' | 'none' =
          active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
        const indicator = active ? (sortDir === 'asc' ? '▲' : '▼') : '';
        const baseAlign = c.align === 'right' ? 'justify-end' : 'justify-start';
        const hide = c.hideOnNarrow ? 'hidden md:flex' : 'flex';
        const cls = `${c.className} ${hide} items-center gap-1 text-[10px] uppercase tracking-wider`;
        if (c.label === '') {
          return <span key={c.key} className={cls} aria-hidden="true" />;
        }
        return (
          <button
            key={c.key}
            type="button"
            role="columnheader"
            aria-sort={ariaSort}
            onClick={() => onSort(c.key)}
            className={`${cls} ${baseAlign} ${active ? 'text-ink-100' : 'text-ink-300'} hover:text-ink-100 focus:outline-none focus:ring-1 focus:ring-accent rounded`}
            title={`Sort by ${c.label} (${active ? (sortDir === 'asc' ? 'asc' : 'desc') : 'click to sort'})`}
          >
            <span>{c.label}</span>
            <span className={`font-mono text-[9px] w-2 ${active ? 'text-accent' : 'text-ink-400 group-hover:opacity-100 opacity-0'}`}>
              {indicator || '·'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
