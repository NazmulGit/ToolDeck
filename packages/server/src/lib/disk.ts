import { readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const CACHE_TTL_MS = 5 * 60_000;
const MAX_FILES = 30_000;
const MAX_DEPTH = 12;
const MAX_TIME_MS = 1_500;

interface DiskResult { bytes: number; capped: boolean }
const cache = new Map<string, { at: number; result: DiskResult }>();

export function clearDiskCache(): void { cache.clear(); }

/** Sum the size of files under `root`, capped at MAX_FILES / MAX_TIME_MS. */
export async function dirSize(root: string): Promise<DiskResult> {
  const cached = cache.get(root);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const start = Date.now();
  let bytes = 0;
  let files = 0;
  let capped = false;

  async function walk(p: string, depth: number): Promise<void> {
    if (capped) return;
    if (Date.now() - start > MAX_TIME_MS) { capped = true; return; }
    if (depth > MAX_DEPTH) { capped = true; return; }
    let entries: import('node:fs').Dirent[] = [];
    try {
      entries = await readdir(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (capped) return;
      if (Date.now() - start > MAX_TIME_MS) { capped = true; return; }
      const full = join(p, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        await walk(full, depth + 1);
      } else if (e.isFile()) {
        files++;
        if (files > MAX_FILES) { capped = true; return; }
        try {
          const s = await stat(full);
          bytes += s.size;
        } catch { /* ignore */ }
      }
    }
  }

  await walk(root, 0);
  const result = { bytes, capped };
  cache.set(root, { at: Date.now(), result });
  return result;
}

/**
 * Best guess at "the install dir" for a given binary path:
 * one or two levels up if the bin is inside common nested layouts.
 */
export function installRoot(binPath: string): string {
  const parent = dirname(binPath);
  const lower = parent.toLowerCase();
  // Patterns: <root>/bin/<exe>, <root>/Scripts/<exe>
  if (lower.endsWith('\\bin') || lower.endsWith('/bin') || lower.endsWith('\\scripts') || lower.endsWith('/scripts')) {
    return dirname(parent);
  }
  return parent;
}
