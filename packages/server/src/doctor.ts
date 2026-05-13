import { totalmem } from 'node:os';
import { currentPlatform, run, which } from './lib/platform.js';

export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  /** Optional command that would address this finding. Not auto-run. */
  fixHint?: string;
}

async function checkCmd(id: string, label: string, bin: string, args = '--version', fixHint?: string): Promise<DoctorCheck> {
  const platform = currentPlatform();
  const path = await which(bin, platform);
  if (!path) {
    return {
      id, label,
      status: 'warn',
      message: `${bin} not found on PATH`,
      fixHint,
    };
  }
  const r = await run(`"${path}" ${args}`, { timeoutMs: 6_000 });
  if (!r.ok) {
    return {
      id, label,
      status: 'fail',
      message: `${bin} exited ${r.code}: ${(r.stderr || r.stdout).split(/\r?\n/)[0]}`,
      fixHint,
    };
  }
  return { id, label, status: 'ok', message: r.stdout.trim().split(/\r?\n/)[0] || 'ok' };
}

async function checkNodeMajor(): Promise<DoctorCheck> {
  const platform = currentPlatform();
  const path = await which('node', platform);
  if (!path) {
    return {
      id: 'node-version', label: 'Node.js',
      status: 'fail',
      message: 'node not found',
      fixHint: platform === 'win32' ? 'winget install --id OpenJS.NodeJS.LTS' : 'brew install node',
    };
  }
  const r = await run(`"${path}" --version`, { timeoutMs: 4_000 });
  const v = (r.stdout.trim() || '').replace(/^v/, '');
  const major = parseInt(v.split('.')[0] || '0', 10);
  if (!major) {
    return { id: 'node-version', label: 'Node.js', status: 'fail', message: `unrecognised version: ${v}` };
  }
  if (major < 20) {
    return {
      id: 'node-version', label: 'Node.js',
      status: 'warn',
      message: `Node v${v} is below v20 (ToolDeck recommends LTS)`,
      fixHint: platform === 'win32' ? 'winget upgrade --id OpenJS.NodeJS.LTS' : 'brew upgrade node',
    };
  }
  return { id: 'node-version', label: 'Node.js', status: 'ok', message: `v${v}` };
}

async function checkMemory(): Promise<DoctorCheck> {
  const totalGb = totalmem() / (1024 ** 3);
  if (totalGb < 2) return { id: 'memory', label: 'System memory', status: 'warn', message: `${totalGb.toFixed(1)} GB (low for dev)` };
  return { id: 'memory', label: 'System memory', status: 'ok', message: `${totalGb.toFixed(1)} GB total` };
}

async function checkDiskFree(): Promise<DoctorCheck> {
  const platform = currentPlatform();
  let r;
  if (platform === 'win32') {
    r = await run('wmic logicaldisk get caption,freespace,size /value', { timeoutMs: 8_000 });
    if (!r.ok) return { id: 'disk', label: 'Disk free', status: 'warn', message: 'wmic not available' };
    const block = r.stdout.split(/\r?\n\r?\n/).find((b) => /Caption=C:/i.test(b));
    const m = block?.match(/FreeSpace=(\d+)/i);
    if (!m) return { id: 'disk', label: 'Disk free', status: 'warn', message: 'free space unknown' };
    const freeGb = Number(m[1]) / (1024 ** 3);
    return freeGb < 5
      ? { id: 'disk', label: 'Disk free (C:)', status: 'warn', message: `${freeGb.toFixed(1)} GB free — low` }
      : { id: 'disk', label: 'Disk free (C:)', status: 'ok', message: `${freeGb.toFixed(1)} GB free` };
  }
  r = await run('df -k / | tail -n 1', { timeoutMs: 5_000 });
  if (!r.ok) return { id: 'disk', label: 'Disk free', status: 'warn', message: 'df failed' };
  const parts = r.stdout.trim().split(/\s+/);
  const freeKb = Number(parts[3] ?? 0);
  const freeGb = freeKb / (1024 * 1024);
  return freeGb < 5
    ? { id: 'disk', label: 'Disk free (/)', status: 'warn', message: `${freeGb.toFixed(1)} GB free — low` }
    : { id: 'disk', label: 'Disk free (/)', status: 'ok', message: `${freeGb.toFixed(1)} GB free` };
}

export async function runDoctor(): Promise<{ checks: DoctorCheck[]; summary: { ok: number; warn: number; fail: number } }> {
  const tasks: Promise<DoctorCheck>[] = [
    checkNodeMajor(),
    checkCmd('pnpm', 'pnpm', 'pnpm', '--version', 'npm install -g pnpm'),
    checkCmd('git', 'Git', 'git', '--version'),
    checkCmd('docker', 'Docker', 'docker', '--version'),
    checkMemory(),
    checkDiskFree(),
  ];
  if (currentPlatform() === 'win32') {
    tasks.push(checkCmd('winget', 'winget', 'winget', '--version'));
  } else if (currentPlatform() === 'darwin') {
    tasks.push(checkCmd('brew', 'Homebrew', 'brew', '--version'));
  }

  const checks = await Promise.all(tasks);
  const summary = { ok: 0, warn: 0, fail: 0 };
  for (const c of checks) summary[c.status]++;
  return { checks, summary };
}
