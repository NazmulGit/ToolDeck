import { allTools } from './catalog.js';
import { currentPlatform, firstLine, pick, run, which } from './lib/platform.js';
import type { Platform, ToolDef, ToolStatus } from './types.js';

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { at: number; status: ToolStatus }>();

export function clearProbeCache(id?: string): void {
  if (id) cache.delete(id);
  else cache.clear();
}

async function probeProcess(
  tool: ToolDef,
  platform: Platform,
): Promise<{ running: boolean; pid?: number }> {
  const proc = tool.service?.processName;
  if (!proc) return { running: false };
  const procName = pick<string>(proc, platform);
  if (!procName) return { running: false };

  if (platform === 'win32') {
    const r = await run(
      `tasklist /FI "IMAGENAME eq ${procName}" /FO CSV /NH`,
      { timeoutMs: 5_000 },
    );
    if (!r.ok) return { running: false };
    const line = r.stdout.split(/\r?\n/).find((l) => l.includes(procName));
    if (!line) return { running: false };
    const parts = line.split('","').map((s) => s.replace(/^"|"$/g, ''));
    const pid = Number(parts[1]);
    return { running: true, pid: Number.isFinite(pid) ? pid : undefined };
  }
  const r = await run(`pgrep -x ${procName}`, { timeoutMs: 4_000 });
  if (!r.ok) return { running: false };
  const pid = Number(firstLine(r.stdout));
  return { running: Number.isFinite(pid), pid: Number.isFinite(pid) ? pid : undefined };
}

export async function probeOne(tool: ToolDef, force = false): Promise<ToolStatus> {
  const platform = currentPlatform();
  const cached = cache.get(tool.id);
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.status;
  }

  const status: ToolStatus = {
    id: tool.id,
    installed: false,
    lastProbedAt: Date.now(),
  };

  const binName = pick<string>(tool.bin, platform);
  if (!binName) {
    status.probeError = `no bin defined for platform ${platform}`;
    cache.set(tool.id, { at: Date.now(), status });
    return status;
  }

  try {
    const path = await which(binName, platform);
    if (!path) {
      const proc = await probeProcess(tool, platform);
      status.running = proc.running;
      status.pid = proc.pid;
      cache.set(tool.id, { at: Date.now(), status });
      return status;
    }
    status.installed = true;
    status.path = path;

    if (tool.versionFlag) {
      const r = await run(`"${path}" ${tool.versionFlag}`, { timeoutMs: 6_000 });
      const blob = (r.stdout + '\n' + r.stderr).trim();
      const ver = firstLine(blob);
      if (ver) status.version = ver;
    }

    const proc = await probeProcess(tool, platform);
    status.running = proc.running;
    status.pid = proc.pid;
  } catch (err) {
    status.probeError = err instanceof Error ? err.message : String(err);
  }

  cache.set(tool.id, { at: Date.now(), status });
  return status;
}

export async function probeAll(force = false): Promise<ToolStatus[]> {
  const results: ToolStatus[] = [];
  // Parallel but cap concurrency to avoid overwhelming the host.
  const queue = [...allTools()];
  const CONCURRENCY = 6;
  const workers: Promise<void>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(
      (async () => {
        while (queue.length) {
          const next = queue.shift();
          if (!next) return;
          results.push(await probeOne(next, force));
        }
      })(),
    );
  }
  await Promise.all(workers);
  return results;
}
