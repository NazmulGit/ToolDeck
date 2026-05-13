export function fmtBytes(b?: number, capped?: boolean): string {
  if (b === undefined || b === null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  const s = (i === 0 ? v.toFixed(0) : v.toFixed(v < 10 ? 1 : 0)) + ' ' + units[i];
  return capped ? `${s}+` : s;
}

export function fmtMs(ms?: number): string {
  if (ms === undefined || ms === null) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ' + (m % 60) + 'm';
  const d = Math.floor(h / 24);
  return d + 'd ' + (h % 24) + 'h';
}

export function fmtCpu(pct?: number): string {
  if (pct === undefined || pct === null) return '—';
  return pct.toFixed(pct < 10 ? 1 : 0) + '%';
}
