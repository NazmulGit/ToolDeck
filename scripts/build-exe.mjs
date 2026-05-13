#!/usr/bin/env node
// Build a single-file ToolDeck.exe via Bun.
//
//   pnpm exe                 # build for the current platform
//   pnpm exe --target=...    # override Bun target (e.g. bun-linux-x64)
//
// Steps:
//   1) Build the UI to packages/ui/dist
//   2) Embed every file as base64 into packages/server/src/generated/ui-bundle.ts
//   3) Run `bun build --compile` against packages/server/src/bun-entry.ts
//   4) Print the resulting binary path + size

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const UI_DIST = join(REPO, 'packages/ui/dist');
const BUNDLE_TS = join(REPO, 'packages/server/src/generated/ui-bundle.ts');
const OUT_DIR = join(REPO, 'dist-exe');
const ENTRY = join(REPO, 'packages/server/src/bun-entry.ts');
const ICON = join(REPO, 'assets/tooldeck.ico');

const argv = process.argv.slice(2);
const targetArg = argv.find((a) => a.startsWith('--target='));
const target = targetArg ? targetArg.slice('--target='.length) : null;

const platformExt = process.platform === 'win32' ? '.exe' : '';
const platformLabel = target ?? (process.platform === 'win32' ? 'bun-windows-x64' : process.platform === 'darwin' ? 'bun-darwin-x64' : 'bun-linux-x64');
const outName = `tooldeck${target ? '-' + target.replace('bun-', '') : ''}${platformExt}`;
const OUT_FILE = join(OUT_DIR, outName);

function run(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: REPO, shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} exited with ${r.status}`);
  }
}

function walk(dir) {
  const list = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) list.push(...walk(full));
    else list.push(full);
  }
  return list;
}

function embedUI() {
  if (!existsSync(UI_DIST)) throw new Error(`missing UI build at ${UI_DIST}`);
  const files = walk(UI_DIST);
  if (files.length === 0) throw new Error('UI dist is empty');
  const entries = files.map((f) => {
    const rel = '/' + relative(UI_DIST, f).split(sep).join('/');
    const b = readFileSync(f);
    return [rel, b.toString('base64'), b.length];
  });

  let lines = [
    '// AUTO-GENERATED — do not edit. Refresh by running `pnpm exe`.',
    '',
    'export const UI_BUNDLE: Record<string, string> = {',
  ];
  let total = 0;
  for (const [rel, b64, raw] of entries) {
    total += raw;
    lines.push(`  ${JSON.stringify(rel)}: ${JSON.stringify(b64)},`);
  }
  lines.push('};');
  lines.push('');
  writeFileSync(BUNDLE_TS, lines.join('\n'), 'utf8');
  console.log(`embedded ${entries.length} files (${(total / 1024).toFixed(1)} KB raw) → ${relative(REPO, BUNDLE_TS)}`);
}

function resetBundle() {
  writeFileSync(BUNDLE_TS, 'export const UI_BUNDLE: Record<string, string> = {};\n', 'utf8');
}

function bunCompile() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const args = ['build', '--compile', '--minify', '--sourcemap=none'];
  if (target) args.push(`--target=${target}`);
  if (existsSync(ICON) && (target?.includes('windows') || (!target && process.platform === 'win32'))) {
    args.push(`--windows-icon=${ICON}`);
  }
  args.push('--outfile', OUT_FILE);
  args.push(ENTRY);
  run('bun', args);
}

function fileSizeKB(p) {
  try { return (statSync(p).size / 1024).toFixed(1) + ' KB'; }
  catch { return '?'; }
}

try {
  console.log('— Step 1/3: build UI');
  run('pnpm', ['--filter', '@tooldeck/ui', 'build']);
  console.log('— Step 2/3: embed UI assets');
  embedUI();
  console.log('— Step 3/3: bun --compile');
  bunCompile();
  console.log(`\n✓ wrote ${OUT_FILE} (${fileSizeKB(OUT_FILE)})`);
} catch (err) {
  console.error('\n✕ exe build failed:', err.message);
  // Reset to empty so dev keeps working.
  resetBundle();
  process.exit(1);
} finally {
  // Always reset the bundle file after build so the dev workflow stays clean.
  // The compiled .exe is independent — it doesn't need the file anymore.
  resetBundle();
}
