import { findTool } from './catalog.js';
import { currentPlatform, pick, run } from './lib/platform.js';
import { clearProbeCache, probeOne } from './probe.js';
import type { ActionId, ActionResult, Platform, ToolDef } from './types.js';

function getProcName(tool: ToolDef, platform: Platform): string | undefined {
  return pick<string>(tool.service?.processName, platform);
}

async function startService(tool: ToolDef, platform: Platform): Promise<ActionResult> {
  const cmd = pick<string>(tool.service?.startCmd, platform);
  if (cmd) {
    // Spawn detached so the parent doesn't wait. We use the shell to avoid
    // having to split args ourselves.
    const { spawn } = await import('node:child_process');
    try {
      const child = spawn(cmd, {
        shell: true,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      return ok(tool.id, 'start', `Spawned: ${cmd} (pid=${child.pid ?? '?'})`);
    } catch (err) {
      return fail(tool.id, 'start', err);
    }
  }
  return fail(tool.id, 'start', new Error('no startCmd defined; cannot start this tool'));
}

async function killByName(
  tool: ToolDef,
  platform: Platform,
  graceful: boolean,
): Promise<ActionResult> {
  const procName = getProcName(tool, platform);
  if (!procName) {
    return fail(tool.id, graceful ? 'stop' : 'kill', new Error('no processName for this tool'));
  }
  let cmd: string;
  if (platform === 'win32') {
    cmd = `taskkill ${graceful ? '' : '/F '}/IM ${procName} /T`.trim();
  } else {
    cmd = `${graceful ? 'pkill' : 'pkill -9'} -x ${procName}`;
  }
  const r = await run(cmd, { timeoutMs: 8_000 });
  clearProbeCache(tool.id);
  if (r.ok) return ok(tool.id, graceful ? 'stop' : 'kill', `Sent ${graceful ? 'SIGTERM' : 'SIGKILL'} to ${procName}`, r.stdout, r.stderr);
  return fail(tool.id, graceful ? 'stop' : 'kill', new Error(r.stderr || `exit ${r.code}`), r.stdout, r.stderr);
}

async function restartService(tool: ToolDef, platform: Platform): Promise<ActionResult> {
  const stop = await killByName(tool, platform, true);
  // Best-effort wait before starting again.
  await new Promise((r) => setTimeout(r, 700));
  const start = await startService(tool, platform);
  return {
    ok: stop.ok && start.ok,
    action: 'restart',
    toolId: tool.id,
    message: `stop: ${stop.message}\nstart: ${start.message}`,
    stdout: [stop.stdout, start.stdout].filter(Boolean).join('\n---\n'),
    stderr: [stop.stderr, start.stderr].filter(Boolean).join('\n---\n'),
  };
}

// Strip CLI progress-bar / spinner noise so the UI shows readable output.
function cleanOutput(s: string): string {
  if (!s) return s;
  const lines = s.split(/\r?\n/);
  const kept = lines.filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^[█▒\s\-/\\|]+$/.test(t)) return false;
    if (/^\s*\d+%\s*$/.test(t)) return false;
    if (/KB\s*\/\s*MB|MB\s*\/\s*MB|KB\s*\/\s*KB|GB\s*\/\s*GB/.test(t)) return false;
    return true;
  });
  return kept.join('\n').trim();
}

// Winget returns 0x8A150014 / 0x8A150045 etc. when "no upgrades found". Treat
// those as informational successes, not failures.
function summarizeWinget(stdout: string): { available: boolean; message: string } {
  const lower = stdout.toLowerCase();
  if (/no applicable upgrade|no available upgrade|no installed package found matching/.test(lower)) {
    return { available: false, message: 'up to date' };
  }
  if (/\bversion\b.*\bavailable\b/i.test(stdout) || /\d+\.\d+/.test(stdout)) {
    return { available: true, message: 'update available' };
  }
  return { available: false, message: 'no update info' };
}

async function checkUpdate(tool: ToolDef, platform: Platform): Promise<ActionResult> {
  if (!tool.update) {
    return fail(tool.id, 'check-update', new Error('no updater configured'));
  }
  const u = tool.update;
  let cmd: string | null = null;
  switch (u.via) {
    case 'winget':
      if (u.pkgId) cmd = `winget upgrade --id ${u.pkgId} --include-unknown --disable-interactivity`;
      break;
    case 'choco':
      if (u.pkgId) cmd = `choco outdated --limit-output | findstr /B "${u.pkgId}|"`;
      break;
    case 'brew':
      if (u.pkgId) cmd = `brew outdated --formula ${u.pkgId}`;
      break;
    case 'npm-g':
      if (u.pkgId) cmd = `npm outdated -g ${u.pkgId}`;
      break;
    case 'pip':
      if (u.pkgId) cmd = `pip list --outdated --format=columns`;
      break;
    case 'uv-tool':
      cmd = `uv tool list`;
      break;
    case 'self':
      cmd = u.selfCmd ? `${u.selfCmd.split(' ')[0]} --help` : null;
      break;
  }
  if (!cmd) return fail(tool.id, 'check-update', new Error('no check command for this updater'));
  const r = await run(cmd, { timeoutMs: 30_000 });
  const stdout = cleanOutput(r.stdout);
  const stderr = cleanOutput(r.stderr);
  let message = r.ok ? 'check completed' : 'no update found';
  if (u.via === 'winget') {
    const s = summarizeWinget(stdout);
    message = s.message;
  }
  return {
    ok: true,
    action: 'check-update',
    toolId: tool.id,
    message,
    stdout,
    stderr,
  };
}

async function doUpdate(tool: ToolDef, platform: Platform): Promise<ActionResult> {
  if (!tool.update) return fail(tool.id, 'update', new Error('no updater configured'));
  const u = tool.update;
  let cmd: string | null = null;
  switch (u.via) {
    case 'winget':
      if (u.pkgId) cmd = `winget upgrade --id ${u.pkgId} --silent --disable-interactivity --accept-package-agreements --accept-source-agreements`;
      break;
    case 'choco':
      if (u.pkgId) cmd = `choco upgrade ${u.pkgId} -y`;
      break;
    case 'brew':
      if (u.pkgId) cmd = `brew upgrade ${u.pkgId}`;
      break;
    case 'apt':
      if (u.pkgId) cmd = `sudo apt-get install --only-upgrade -y ${u.pkgId}`;
      break;
    case 'npm-g':
      if (u.pkgId) cmd = `npm install -g ${u.pkgId}@latest`;
      break;
    case 'pip':
      if (u.pkgId) cmd = `pip install --upgrade ${u.pkgId}`;
      break;
    case 'uv-tool':
      if (u.pkgId) cmd = `uv tool upgrade ${u.pkgId}`;
      break;
    case 'pipx':
      if (u.pkgId) cmd = `pipx upgrade ${u.pkgId}`;
      break;
    case 'self':
      if (u.selfCmd) cmd = u.selfCmd;
      break;
  }
  if (!cmd) return fail(tool.id, 'update', new Error('no update command for this updater'));
  const r = await run(cmd, { timeoutMs: 5 * 60_000 });
  clearProbeCache(tool.id);
  return {
    ok: r.ok,
    action: 'update',
    toolId: tool.id,
    message: r.ok ? 'update completed' : `update failed (exit ${r.code})`,
    stdout: cleanOutput(r.stdout),
    stderr: cleanOutput(r.stderr),
  };
}

async function doUninstall(tool: ToolDef, platform: Platform): Promise<ActionResult> {
  if (!tool.update) {
    return fail(tool.id, 'uninstall', new Error('no package manager known for this tool — uninstall manually'));
  }
  const u = tool.update;
  let cmd: string | null = null;
  switch (u.via) {
    case 'winget':
      if (u.pkgId) cmd = `winget uninstall --id ${u.pkgId} --silent --disable-interactivity --accept-source-agreements`;
      break;
    case 'choco':
      if (u.pkgId) cmd = `choco uninstall ${u.pkgId} -y`;
      break;
    case 'brew':
      if (u.pkgId) cmd = `brew uninstall ${u.pkgId}`;
      break;
    case 'apt':
      if (u.pkgId) cmd = `sudo apt-get remove -y ${u.pkgId}`;
      break;
    case 'npm-g':
      if (u.pkgId) cmd = `npm uninstall -g ${u.pkgId}`;
      break;
    case 'pip':
      if (u.pkgId) cmd = `pip uninstall -y ${u.pkgId}`;
      break;
    case 'uv-tool':
      if (u.pkgId) cmd = `uv tool uninstall ${u.pkgId}`;
      break;
    case 'pipx':
      if (u.pkgId) cmd = `pipx uninstall ${u.pkgId}`;
      break;
    case 'self':
      return fail(tool.id, 'uninstall', new Error('self-managed tool — uninstall manually'));
  }
  if (!cmd) return fail(tool.id, 'uninstall', new Error('no uninstall command available'));
  const r = await run(cmd, { timeoutMs: 5 * 60_000 });
  clearProbeCache(tool.id);
  return {
    ok: r.ok,
    action: 'uninstall',
    toolId: tool.id,
    message: r.ok ? 'uninstall completed' : `uninstall failed (exit ${r.code})`,
    stdout: cleanOutput(r.stdout),
    stderr: cleanOutput(r.stderr),
  };
}

async function doRepair(tool: ToolDef, platform: Platform): Promise<ActionResult> {
  if (!tool.update) {
    return fail(tool.id, 'repair', new Error('no package manager known for this tool — repair manually'));
  }
  const u = tool.update;
  // Strategy: force a reinstall of the current version through the same package
  // manager. winget has no first-class repair; --force re-acquires the package.
  let cmd: string | null = null;
  switch (u.via) {
    case 'winget':
      if (u.pkgId) cmd = `winget install --id ${u.pkgId} --silent --force --disable-interactivity --accept-package-agreements --accept-source-agreements`;
      break;
    case 'choco':
      if (u.pkgId) cmd = `choco install ${u.pkgId} -y --force`;
      break;
    case 'brew':
      if (u.pkgId) cmd = `brew reinstall ${u.pkgId}`;
      break;
    case 'apt':
      if (u.pkgId) cmd = `sudo apt-get install --reinstall -y ${u.pkgId}`;
      break;
    case 'npm-g':
      if (u.pkgId) cmd = `npm install -g ${u.pkgId}@latest`;
      break;
    case 'pip':
      if (u.pkgId) cmd = `pip install --force-reinstall ${u.pkgId}`;
      break;
    case 'uv-tool':
      if (u.pkgId) cmd = `uv tool install --force ${u.pkgId}`;
      break;
    case 'pipx':
      if (u.pkgId) cmd = `pipx reinstall ${u.pkgId}`;
      break;
    case 'self':
      return fail(tool.id, 'repair', new Error('self-managed tool — repair manually'));
  }
  if (!cmd) return fail(tool.id, 'repair', new Error('no repair command available'));
  const r = await run(cmd, { timeoutMs: 10 * 60_000 });
  clearProbeCache(tool.id);
  return {
    ok: r.ok,
    action: 'repair',
    toolId: tool.id,
    message: r.ok ? 'repair completed' : `repair failed (exit ${r.code})`,
    stdout: cleanOutput(r.stdout),
    stderr: cleanOutput(r.stderr),
  };
}

function ok(toolId: string, action: ActionId, message: string, stdout?: string, stderr?: string): ActionResult {
  return { ok: true, action, toolId, message, stdout, stderr };
}

function fail(toolId: string, action: ActionId, err: unknown, stdout?: string, stderr?: string): ActionResult {
  return {
    ok: false,
    action,
    toolId,
    message: err instanceof Error ? err.message : String(err),
    stdout,
    stderr,
  };
}

export async function performAction(toolId: string, action: ActionId): Promise<ActionResult> {
  const tool = findTool(toolId);
  if (!tool) return fail(toolId, action, new Error(`unknown tool: ${toolId}`));
  const platform = (await import('./lib/platform.js')).currentPlatform();

  switch (action) {
    case 'start':
      return startService(tool, platform);
    case 'stop':
      return killByName(tool, platform, true);
    case 'restart':
      return restartService(tool, platform);
    case 'kill':
      return killByName(tool, platform, false);
    case 'check-update':
      return checkUpdate(tool, platform);
    case 'update':
      return doUpdate(tool, platform);
    case 'uninstall':
      return doUninstall(tool, platform);
    case 'repair':
      return doRepair(tool, platform);
    case 'open-docs': {
      const url = tool.docsUrl || tool.homeUrl;
      if (!url) return fail(tool.id, action, new Error('no docs URL'));
      return ok(tool.id, action, url);
    }
    case 'open-location': {
      const st = await probeOne(tool);
      if (!st.path) return fail(tool.id, action, new Error('not installed'));
      return ok(tool.id, action, st.path);
    }
    default:
      return fail(toolId, action, new Error(`unknown action: ${action}`));
  }
}
