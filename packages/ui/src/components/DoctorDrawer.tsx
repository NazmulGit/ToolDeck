import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DoctorCheck, DoctorReport } from '../types';

interface Props {
  onClose: () => void;
}

export function DoctorDrawer({ onClose }: Props) {
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function run() {
    setLoading(true);
    try { setReport(await api.doctor()); }
    finally { setLoading(false); }
  }

  useEffect(() => { run(); }, []);

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-panel" style={{ width: 'min(640px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">System health</h2>
            <p className="text-xs text-ink-300 mt-0.5">Read-only checks. Fix hints are shown but never auto-run.</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-100 text-sm">✕</button>
        </div>

        <div className="px-5 py-4">
          {loading && <div className="text-sm text-ink-200">Running checks…</div>}
          {report && (
            <>
              <div className="flex items-center gap-3 text-xs mb-4">
                <span className="text-ink-300">Summary:</span>
                <Pill kind="ok" count={report.summary.ok} label="OK" />
                <Pill kind="warn" count={report.summary.warn} label="WARN" />
                <Pill kind="fail" count={report.summary.fail} label="FAIL" />
              </div>
              <div className="border border-line rounded-md divide-y divide-line">
                {report.checks.map((c) => (
                  <Row key={c.id} check={c} />
                ))}
              </div>
              <div className="pt-3 flex justify-end">
                <button
                  onClick={run}
                  className="px-3 py-1.5 text-sm rounded-md bg-accent text-white font-medium hover:opacity-90"
                >
                  Re-run
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ kind, count, label }: { kind: 'ok' | 'warn' | 'fail'; count: number; label: string }) {
  const cls = kind === 'ok'
    ? 'text-good border-good/40 bg-good/10'
    : kind === 'warn'
    ? 'text-warm border-warm/40 bg-warm/10'
    : 'text-bad border-bad/40 bg-bad/10';
  return (
    <span className={`px-2 py-0.5 rounded border ${cls} font-mono`}>{count} {label}</span>
  );
}

function Row({ check }: { check: DoctorCheck }) {
  const color = check.status === 'ok' ? 'text-good' : check.status === 'warn' ? 'text-warm' : 'text-bad';
  return (
    <div className="px-3 py-2 flex items-start gap-3">
      <span className={`text-sm ${color} font-medium w-12 shrink-0`}>{check.status.toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm">{check.label}</div>
        <div className="text-xs text-ink-200">{check.message}</div>
        {check.fixHint && (
          <div className="text-[11px] mt-1 text-ink-300">
            Fix hint: <code className="kbd">{check.fixHint}</code>
          </div>
        )}
      </div>
    </div>
  );
}
