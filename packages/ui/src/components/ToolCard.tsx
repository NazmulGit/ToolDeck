import type { ToolView } from '../types';
import { KindBadge } from './KindBadge';
import { StatusDot } from './StatusDot';

interface Props {
  tool: ToolView;
  selected: boolean;
  onClick: () => void;
}

export function ToolCard({ tool, selected, onClick }: Props) {
  const { status } = tool;
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border transition group ${
        selected
          ? 'border-accent bg-ink-700/70'
          : 'border-ink-700 bg-ink-800/40 hover:border-ink-500 hover:bg-ink-700/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <h3 className="font-medium truncate">{tool.name}</h3>
        </div>
        <KindBadge kind={tool.kind} />
      </div>
      <p className="text-xs text-ink-200 line-clamp-2 mb-2">{tool.description}</p>
      <div className="flex items-center gap-2 text-[11px] text-ink-300">
        {status.installed ? (
          <span className="font-mono truncate">{status.version || '✓ installed'}</span>
        ) : (
          <span className="text-ink-400">not installed</span>
        )}
        {status.running && (
          <span className="ml-auto text-accent-good font-medium">running</span>
        )}
      </div>
    </button>
  );
}
