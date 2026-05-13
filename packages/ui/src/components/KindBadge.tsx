import type { ToolKind } from '../types';

const STYLES: Record<ToolKind, string> = {
  'runtime': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'pkg-manager': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'ai-cli': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'dev-cli': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'service': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'app': 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  'util': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const LABELS: Record<ToolKind, string> = {
  'runtime': 'runtime',
  'pkg-manager': 'pkg mgr',
  'ai-cli': 'AI',
  'dev-cli': 'dev',
  'service': 'service',
  'app': 'app',
  'util': 'util',
};

export function KindBadge({ kind }: { kind: ToolKind }) {
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${STYLES[kind]}`}>
      {LABELS[kind]}
    </span>
  );
}
