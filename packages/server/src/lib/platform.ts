import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Platform } from '../types.js';

const execP = promisify(exec);

export function currentPlatform(): Platform {
  const p = process.platform;
  if (p === 'win32' || p === 'darwin' || p === 'linux') return p;
  // Best-effort fallback: most BSDs feel Linux-ish for our purposes.
  return 'linux';
}

export function pick<T>(
  value: Partial<Record<Platform, T>> | T | undefined,
  platform: Platform,
): T | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Partial<Record<Platform, T>>;
    return obj[platform] ?? obj['linux'] ?? obj['darwin'] ?? obj['win32'];
  }
  return value as T;
}

export interface RunResult {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

export async function run(
  cmd: string,
  opts: { timeoutMs?: number; cwd?: string } = {},
): Promise<RunResult> {
  const timeout = opts.timeoutMs ?? 8_000;
  try {
    const { stdout, stderr } = await execP(cmd, {
      timeout,
      cwd: opts.cwd,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    return { ok: true, code: 0, stdout: String(stdout), stderr: String(stderr) };
  } catch (err: any) {
    return {
      ok: false,
      code: typeof err?.code === 'number' ? err.code : 1,
      stdout: String(err?.stdout ?? ''),
      stderr: String(err?.stderr ?? err?.message ?? ''),
    };
  }
}

export async function which(bin: string, platform: Platform): Promise<string | null> {
  // Resolve to an absolute path. On Windows use `where`, elsewhere `command -v`.
  if (platform === 'win32') {
    const r = await run(`where ${bin}`, { timeoutMs: 4_000 });
    if (!r.ok) return null;
    const first = r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    return first || null;
  }
  const r = await run(`command -v ${bin}`, { timeoutMs: 4_000 });
  if (!r.ok) return null;
  return r.stdout.trim() || null;
}

export function firstLine(s: string): string {
  return s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] ?? '';
}

export function quote(p: string): string {
  if (/^[A-Za-z0-9_\-./\\:]+$/.test(p)) return p;
  return `"${p.replace(/"/g, '\\"')}"`;
}
