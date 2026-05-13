import { fmtBytes, fmtCpu, fmtMs } from '../lib/format';
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
      className={`text-left rounded-lg border transition group card-pad ${
        selected
          ? 'border-accent bg-ink-700/70'
          : 'border-ink-400 bg-ink-800/40 hover:border-ink-300 hover:bg-ink-700/30'
      }`}
      style={{ padding: '0.85rem' }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <h3 className="font-medium truncate card-title">{tool.name}</h3>
        </div>
        <KindBadge kind={tool.kind} />
      </div>
      <p className="text-xs text-ink-200 line-clamp-2 mb-2 card-desc">{tool.description}</p>
      <div className="flex items-center gap-2 text-[11px] text-ink-300 flex-wrap">
        {status.installed ? (
          <span className="font-mono truncate max-w-[170px]">{status.version || '✓ installed'}</span>
        ) : (
          <span className="text-ink-300">not installed</span>
        )}
        {status.diskBytes !== undefined && (
          <span title="install size" className="opacity-80">· {fmtBytes(status.diskBytes, status.diskCapped)}</span>
        )}
        {status.running && (
          <span className="ml-auto flex items-center gap-1.5 text-good font-medium">
            running
            {status.metrics && (
              <>
                <span className="text-ink-300 font-normal">·</span>
                <span title="cpu" className="font-mono text-ink-100 font-normal">{fmtCpu(status.metrics.cpu)}</span>
                <span title="mem" className="font-mono text-ink-100 font-normal">{fmtBytes(status.metrics.memoryBytes)}</span>
                <span title="uptime" className="font-mono text-ink-200 font-normal">{fmtMs(status.metrics.uptimeMs)}</span>
              </>
            )}
          </span>
        )}
      </div>
    </button>
  );
}
