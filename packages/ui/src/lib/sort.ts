import type { SortDir, SortKey } from './settings';
import type { ToolView } from '../types';

// Status ordering: running first, then installed, then missing.
function statusRank(t: ToolView): number {
  if (t.status.running) return 0;
  if (t.status.installed) return 1;
  return 2;
}

function val(t: ToolView, key: SortKey): string | number | null {
  switch (key) {
    case 'name': return t.name.toLowerCase();
    case 'description': return t.description.toLowerCase();
    case 'kind': return t.kind;
    case 'version': return (t.status.version ?? '').toLowerCase();
    case 'disk': return t.status.diskBytes ?? null;
    case 'cpu': return t.status.metrics?.cpu ?? null;
    case 'memory': return t.status.metrics?.memoryBytes ?? null;
    case 'uptime': return t.status.metrics?.uptimeMs ?? null;
    case 'status': return statusRank(t);
  }
}

/**
 * Stable sort that always puts undefined / null / empty values at the END,
 * regardless of direction — the convention users expect from data tables.
 */
export function sortTools(tools: ToolView[], key: SortKey, dir: SortDir): ToolView[] {
  if (!dir) return tools;
  const sign = dir === 'asc' ? 1 : -1;
  const withIdx = tools.map((t, i) => ({ t, i }));
  withIdx.sort((a, b) => {
    const av = val(a.t, key);
    const bv = val(b.t, key);
    const aEmpty = av === null || av === '' || av === undefined;
    const bEmpty = bv === null || bv === '' || bv === undefined;
    if (aEmpty && bEmpty) return a.i - b.i;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      const d = av - bv;
      if (d !== 0) return d * sign;
      return a.i - b.i;
    }
    const s = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
    if (s !== 0) return s * sign;
    return a.i - b.i;
  });
  return withIdx.map((x) => x.t);
}

/** Click a header → cycle: none/desc → asc → desc → none for the same key,
 * or jump straight to asc when switching keys. */
export function cycleSort(currentKey: SortKey, currentDir: SortDir, nextKey: SortKey): { sortKey: SortKey; sortDir: SortDir } {
  if (nextKey !== currentKey) return { sortKey: nextKey, sortDir: 'asc' };
  if (currentDir === 'asc') return { sortKey: nextKey, sortDir: 'desc' };
  if (currentDir === 'desc') return { sortKey: nextKey, sortDir: null };
  return { sortKey: nextKey, sortDir: 'asc' };
}
