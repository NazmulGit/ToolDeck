import pidusage from 'pidusage';
import type { ToolMetrics } from './types.js';

/**
 * Live process metrics for a running tool. Returns null if the PID is gone.
 * pidusage covers Windows / macOS / Linux without native modules.
 */
export async function getMetrics(pid: number): Promise<ToolMetrics | null> {
  try {
    const s = await pidusage(pid);
    return {
      cpu: s.cpu,
      memoryBytes: s.memory,
      uptimeMs: s.elapsed,
      startedAt: s.timestamp - s.elapsed,
      pid: s.pid,
    };
  } catch {
    return null;
  }
}

export async function getMetricsBatch(pids: number[]): Promise<Record<number, ToolMetrics | null>> {
  if (!pids.length) return {};
  try {
    const res = await pidusage(pids);
    const out: Record<number, ToolMetrics | null> = {};
    for (const pid of pids) {
      const s = res[pid];
      out[pid] = s
        ? {
            cpu: s.cpu,
            memoryBytes: s.memory,
            uptimeMs: s.elapsed,
            startedAt: s.timestamp - s.elapsed,
            pid: s.pid,
          }
        : null;
    }
    return out;
  } catch {
    return Object.fromEntries(pids.map((p) => [p, null]));
  }
}
