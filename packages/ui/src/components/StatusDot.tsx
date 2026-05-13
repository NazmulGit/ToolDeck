import type { ToolStatus } from '../types';

export function StatusDot({ status }: { status: ToolStatus }) {
  let color = 'bg-ink-400';
  let title = 'not installed';
  if (status.installed) {
    color = 'bg-accent-good';
    title = 'installed';
  }
  if (status.running) {
    color = 'bg-accent';
    title = 'running';
  }
  if (status.probeError) {
    color = 'bg-accent-bad';
    title = `probe error: ${status.probeError}`;
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`}
      title={title}
    />
  );
}
