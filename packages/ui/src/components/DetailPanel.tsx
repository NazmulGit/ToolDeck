import { useState } from 'react';
import { api } from '../api';
import type { ActionId, ActionResult, ToolView } from '../types';
import { ActionButton } from './ActionButton';
import { KindBadge } from './KindBadge';
import { StatusDot } from './StatusDot';

interface Props {
  tool: ToolView | null;
  onChanged: () => void;
  onHide?: (id: string) => void;
}

const SYSTEM_ACTIONS: { id: ActionId; label: string; danger?: boolean }[] = [
  { id: 'start', label: 'Start' },
  { id: 'stop', label: 'Stop' },
  { id: 'restart', label: 'Restart' },
  { id: 'kill', label: 'Kill', danger: true },
  { id: 'check-update', label: 'Check update' },
  { id: 'update', label: 'Update' },
];

export function DetailPanel({ tool, onChanged, onHide }: Props) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, setPending] = useState<ActionId | null>(null);

  if (!tool) {
    return (
      <div className="h-full grid place-items-center text-ink-200 text-sm p-6 text-center">
        Pick a tool from the grid to see its details and run system actions.
      </div>
    );
  }

  const run = async (action: ActionId) => {
    try {
      setPending(action);
      setResult(null);
      const r = await api.action(tool.id, action);
      setResult(r);
      if (['start', 'stop', 'restart', 'kill', 'update'].includes(action)) {
        // Refresh probes after any state-changing action.
        setTimeout(onChanged, 800);
      }
    } catch (e) {
      setResult({
        ok: false,
        action,
        toolId: tool.id,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setPending(null);
    }
  };

  const { status } = tool;

  return (
    <div className="p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <StatusDot status={status} />
          <h2 className="text-lg font-semibold">{tool.name}</h2>
          <KindBadge kind={tool.kind} />
        </div>
        <p className="text-sm text-ink-200">{tool.description}</p>
      </div>

      <Section title="Design">
        <Row label="View">{tool.name}</Row>
        <Row label="Show">
          {status.installed ? (
            <span className="text-accent-good">installed</span>
          ) : (
            <span className="text-ink-300">not installed</span>
          )}
          {status.running && <span className="ml-2 text-accent font-medium">running (pid {status.pid ?? '?'})</span>}
          {status.version && (
            <span className="ml-2 font-mono text-ink-200 text-xs">{status.version}</span>
          )}
        </Row>
        <Row label="Uses">{tool.uses}</Row>
        <Row label="Location">
          <span className="font-mono text-xs break-all">
            {status.path ?? '—'}
          </span>
        </Row>
        <Row label="Where used">
          <ul className="list-disc list-inside text-sm">
            {tool.whereUsed.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Row>
        {tool.tags?.length ? (
          <Row label="Tags">
            <div className="flex flex-wrap gap-1">
              {tool.tags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ink-700 text-ink-200">
                  {t}
                </span>
              ))}
            </div>
          </Row>
        ) : null}
      </Section>

      <Section title="System">
        <div className="grid grid-cols-2 gap-2">
          {SYSTEM_ACTIONS.map((a) => (
            <ActionButton
              key={a.id}
              label={a.label}
              danger={a.danger}
              pending={pending === a.id}
              disabled={pending !== null}
              onClick={() => run(a.id)}
            />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <ActionButton
            label="Open docs"
            pending={pending === 'open-docs'}
            disabled={pending !== null || !(tool.docsUrl || tool.homeUrl)}
            onClick={async () => {
              const r = await api.action(tool.id, 'open-docs');
              if (r.ok && r.message) window.open(r.message, '_blank', 'noopener');
              setResult(r);
            }}
            ghost
          />
          <ActionButton
            label="Reveal path"
            pending={pending === 'open-location'}
            disabled={pending !== null || !status.installed}
            onClick={() => run('open-location')}
            ghost
          />
        </div>
        {tool.update && (
          <div className="text-[11px] text-ink-300 pt-1">
            Updater: <span className="font-mono">{tool.update.via}</span>
            {tool.update.pkgId && <> · <span className="font-mono">{tool.update.pkgId}</span></>}
          </div>
        )}
        {onHide && (
          <div className="pt-2">
            <button
              onClick={() => onHide(tool.id)}
              className="text-xs text-ink-300 hover:text-bad"
              title="Remove from view (Settings → Visibility to restore)"
            >
              Hide from dashboard
            </button>
          </div>
        )}
      </Section>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-ink-300 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 text-sm">
      <div className="text-ink-300">{label}</div>
      <div className="text-ink-100 min-w-0">{children}</div>
    </div>
  );
}

function ResultPanel({ result }: { result: ActionResult }) {
  const accent = result.ok ? 'border-accent-good/40' : 'border-accent-bad/40';
  return (
    <div className={`rounded-md border ${accent} bg-ink-900/40 p-3 text-xs space-y-2`}>
      <div className="flex items-center gap-2">
        <span className={result.ok ? 'text-accent-good' : 'text-accent-bad'}>
          {result.ok ? '✓' : '✕'}
        </span>
        <span className="font-medium">{result.action}</span>
        <span className="text-ink-200">{result.message}</span>
      </div>
      {result.stdout && (
        <pre className="font-mono text-[11px] text-ink-200 whitespace-pre-wrap max-h-40 overflow-auto scroll-thin">
{result.stdout}
        </pre>
      )}
      {result.stderr && (
        <pre className="font-mono text-[11px] text-accent-warm whitespace-pre-wrap max-h-40 overflow-auto scroll-thin">
{result.stderr}
        </pre>
      )}
    </div>
  );
}
