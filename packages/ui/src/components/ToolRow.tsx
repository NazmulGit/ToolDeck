import { fmtBytes, fmtCpu, fmtMs } from '../lib/format';
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

export function ToolRowHeader() {
  return (
    <div className="px-3 py-2 flex items-center gap-3 border-b border-line text-[10px] uppercase tracking-wider text-ink-300">
      <span className="w-2" />
      <div className="w-44">Name</div>
      <span className="w-[68px]" />
      <div className="hidden md:block flex-1">Description</div>
      <div className="w-24 text-right">Version</div>
      <div className="w-20 text-right">Disk</div>
      <div className="w-16 text-right">CPU</div>
      <div className="w-20 text-right">Memory</div>
      <div className="w-20 text-right">Uptime</div>
    </div>
  );
}
