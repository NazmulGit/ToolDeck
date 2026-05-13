import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, type ListResp } from './api';
import { CommandPalette } from './components/CommandPalette';
import { DetailPanel } from './components/DetailPanel';
import { DoctorDrawer } from './components/DoctorDrawer';
import { Filters } from './components/Filters';
import { SettingsModal } from './components/SettingsModal';
import { ToolCard } from './components/ToolCard';
import { ToolRow, ToolRowHeader } from './components/ToolRow';
import { ViewModeToggle } from './components/ViewModeToggle';
import { useSettings, type SortKey } from './lib/settings';
import { cycleSort, sortTools } from './lib/sort';
import type { ActionId, ToolKind, ToolView } from './types';

const KIND_ORDER: ToolKind[] = ['ai-cli', 'runtime', 'pkg-manager', 'dev-cli', 'service', 'util', 'app'];
const KIND_LABEL: Record<ToolKind, string> = {
  'ai-cli': 'AI / agent CLIs',
  'runtime': 'Language runtimes',
  'pkg-manager': 'Package managers',
  'dev-cli': 'Dev / cloud CLIs',
  'service': 'Services',
  'util': 'Utilities',
  'app': 'Apps',
};

export function App() {
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useSettings();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [lastResultMsg, setLastResultMsg] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const resp = await api.list(force);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(false); }, [refresh]);

  useEffect(() => {
    if (settings.autoRefreshSec <= 0) return;
    const handle = setInterval(() => refresh(true), settings.autoRefreshSec * 1000);
    return () => clearInterval(handle);
  }, [settings.autoRefreshSec, refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle('density-compact', settings.density === 'compact');
  }, [settings.density]);

  const tools = useMemo<ToolView[]>(() => {
    const list = data?.tools ?? [];
    const hidden = new Set(data?.settings?.hiddenIds ?? []);
    return list.filter((t) => !hidden.has(t.id));
  }, [data]);

  const filtered = useMemo(() => {
    const q = settings.search.trim().toLowerCase();
    const matched = tools.filter((t) => {
      if (settings.kindFilter !== 'all' && t.kind !== settings.kindFilter) return false;
      if (settings.statusFilter === 'installed' && !t.status.installed) return false;
      if (settings.statusFilter === 'missing' && t.status.installed) return false;
      if (settings.statusFilter === 'running' && !t.status.running) return false;
      if (!settings.showMissing && !t.status.installed && settings.statusFilter === 'all') return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.uses.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
    return sortTools(matched, settings.sortKey, settings.sortDir);
  }, [tools, settings.search, settings.kindFilter, settings.statusFilter, settings.showMissing, settings.sortKey, settings.sortDir]);

  const handleSort = useCallback((next: SortKey) => {
    const r = cycleSort(settings.sortKey, settings.sortDir, next);
    setSettings(r);
  }, [settings.sortKey, settings.sortDir, setSettings]);

  const counts = useMemo(() => ({
    total: tools.length,
    installed: tools.filter((t) => t.status.installed).length,
    running: tools.filter((t) => t.status.running).length,
    missing: tools.filter((t) => !t.status.installed).length,
  }), [tools]);

  const selected = useMemo(
    () => (settings.selectedId ? tools.find((t) => t.id === settings.selectedId) ?? null : null),
    [settings.selectedId, tools],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if (meta && e.key === ',') { e.preventDefault(); setSettingsOpen(true); return; }
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (doctorOpen) { setDoctorOpen(false); return; }
      }
      if (inField) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); refresh(true); return; }
      if (e.key.toLowerCase() === 'd') { e.preventDefault(); setDoctorOpen(true); return; }
      if (e.key === '?') { e.preventDefault(); setPaletteOpen(true); return; }

      // Arrow navigation through the visible list.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (filtered.length === 0) return;
        const idx = filtered.findIndex((t) => t.id === settings.selectedId);
        const next = e.key === 'ArrowDown'
          ? Math.min(filtered.length - 1, idx < 0 ? 0 : idx + 1)
          : Math.max(0, idx < 0 ? 0 : idx - 1);
        if (filtered[next]) {
          e.preventDefault();
          setSettings({ selectedId: filtered[next].id });
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, settingsOpen, doctorOpen, refresh, filtered, settings.selectedId, setSettings]);

  const runAction = useCallback(
    async (id: string, action: ActionId) => {
      try {
        setLastResultMsg(`${action} ${id}…`);
        const r = await api.action(id, action);
        setLastResultMsg(`${r.ok ? '✓' : '✕'} ${action} ${id}: ${r.message}`);
        if (['start', 'stop', 'restart', 'kill', 'update', 'uninstall', 'repair'].includes(action)) {
          setTimeout(() => refresh(true), 700);
        }
        return r;
      } catch (e) {
        setLastResultMsg(`✕ ${action} ${id}: ${e instanceof Error ? e.message : e}`);
      }
    },
    [refresh],
  );

  const selectTool = (id: string) => setSettings({ selectedId: id });

  return (
    <div className="min-h-screen flex flex-col bg-ink-900 text-ink-100">
      <header className="border-b border-ink-400 bg-ink-800/80 backdrop-blur sticky top-0 z-20">
        <div className="px-6 py-3.5 flex items-center gap-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              <span className="text-accent">Tool</span>Deck
            </h1>
            <span className="text-[11px] text-ink-200">v0.3.1 · CLI / agent / dev-tool dashboard</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-200 ml-auto">
            <Stat label="installed" value={`${counts.installed}/${counts.total}`} />
            <Stat label="running" value={String(counts.running)} good={counts.running > 0} />
            <Stat label="missing" value={String(counts.missing)} />
            <ViewModeToggle value={settings.viewMode} onChange={(v) => setSettings({ viewMode: v })} />
            <button
              onClick={() => setDoctorOpen(true)}
              className="px-3 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-xs text-ink-100 hover:border-accent"
              title="Fix system (D)"
            >
              Fix system
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="px-3 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-xs text-ink-100 hover:border-accent flex items-center gap-2"
              title="Command palette"
            >
              <span>Search</span>
              <span className="kbd">⌘K</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-xs text-ink-100 hover:border-accent"
              title="Settings (⌘,)"
            >
              Settings
            </button>
            <button
              onClick={() => refresh(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-md bg-accent text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
              title="Refresh (R)"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        <Filters
          inputRef={searchRef}
          search={settings.search}
          onSearch={(s) => setSettings({ search: s })}
          kind={settings.kindFilter as ToolKind | 'all'}
          onKind={(k) => setSettings({ kindFilter: k })}
          filter={settings.statusFilter as 'all' | 'installed' | 'missing' | 'running'}
          onFilter={(f) => setSettings({ statusFilter: f })}
        />
      </header>

      <main className="flex-1 grid grid-cols-[1fr_440px] gap-0 overflow-hidden">
        <section className="overflow-auto scroll-thin px-6 py-5">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-md border border-bad text-bad text-sm" style={{ background: 'color-mix(in srgb, var(--bad) 12%, transparent)' }}>
              {error}
            </div>
          )}
          {loading && !data && (
            <div className="text-ink-200 text-sm">Probing tools on this PC…</div>
          )}

          {settings.viewMode !== 'list' && settings.sortDir && (
            <SortChip
              sortKey={settings.sortKey}
              sortDir={settings.sortDir}
              onClear={() => setSettings({ sortDir: null })}
            />
          )}

          {settings.viewMode === 'grid' && (
            <GridView tools={filtered} selectedId={settings.selectedId} onSelect={selectTool} />
          )}
          {settings.viewMode === 'list' && (
            <ListView
              tools={filtered}
              selectedId={settings.selectedId}
              onSelect={selectTool}
              sortKey={settings.sortKey}
              sortDir={settings.sortDir}
              onSort={handleSort}
            />
          )}
          {settings.viewMode === 'group' && (
            <GroupView tools={filtered} selectedId={settings.selectedId} onSelect={selectTool} />
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              hasData={tools.length > 0}
              onClear={() => setSettings({ search: '', kindFilter: 'all', statusFilter: 'all' })}
            />
          )}
        </section>

        <aside className="border-l border-ink-400 bg-ink-800/40 overflow-auto scroll-thin">
          <DetailPanel
            tool={selected}
            onChanged={() => refresh(true)}
            onHide={(id) => {
              const next = [...(data?.settings?.hiddenIds ?? []), id];
              api.patchSettings({ hiddenIds: next }).then(() => refresh(true));
            }}
          />
        </aside>
      </main>

      {lastResultMsg && (
        <div
          onClick={() => setLastResultMsg(null)}
          className="fixed bottom-4 right-4 max-w-md px-3 py-2 rounded-md border border-ink-400 bg-ink-700 text-xs text-ink-100 shadow-lg cursor-pointer hover:bg-ink-600"
        >
          {lastResultMsg}
        </div>
      )}

      {paletteOpen && (
        <CommandPalette
          tools={tools}
          onClose={() => setPaletteOpen(false)}
          onSelect={(id) => { setSettings({ selectedId: id }); setPaletteOpen(false); }}
          onAction={(id, action) => { runAction(id, action); setPaletteOpen(false); }}
          onOpenSettings={() => { setPaletteOpen(false); setSettingsOpen(true); }}
          onRefresh={() => { setPaletteOpen(false); refresh(true); }}
        />
      )}
      {settingsOpen && data && (
        <SettingsModal
          uiSettings={settings}
          onUISettings={setSettings}
          serverSettings={data.settings}
          tools={data.tools}
          onClose={() => setSettingsOpen(false)}
          onChanged={() => refresh(true)}
        />
      )}
      {doctorOpen && <DoctorDrawer onClose={() => setDoctorOpen(false)} />}
    </div>
  );
}

function GridView({ tools, selectedId, onSelect }: { tools: ToolView[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (tools.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {tools.map((t) => (
        <ToolCard
          key={t.id}
          tool={t}
          selected={t.id === selectedId}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </div>
  );
}

function ListView({ tools, selectedId, onSelect, sortKey, sortDir, onSort }: {
  tools: ToolView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc' | null;
  onSort: (k: SortKey) => void;
}) {
  if (tools.length === 0) return null;
  return (
    <div role="grid" className="rounded-md border border-line bg-ink-800/40 overflow-hidden">
      <ToolRowHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      {tools.map((t) => (
        <ToolRow key={t.id} tool={t} selected={t.id === selectedId} onClick={() => onSelect(t.id)} />
      ))}
    </div>
  );
}

function SortChip({ sortKey, sortDir, onClear }: { sortKey: SortKey; sortDir: 'asc' | 'desc'; onClear: () => void }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-md bg-ink-700 border border-ink-400 text-ink-200">
      <span className="text-ink-300">sorted by</span>
      <span className="font-medium text-ink-100">{sortKey}</span>
      <span className="font-mono text-accent">{sortDir === 'asc' ? '▲' : '▼'}</span>
      <button onClick={onClear} className="text-ink-300 hover:text-bad ml-1" title="Clear sort">✕</button>
    </div>
  );
}

function GroupView({ tools, selectedId, onSelect }: { tools: ToolView[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (tools.length === 0) return null;
  const groups = new Map<ToolKind, ToolView[]>();
  for (const k of KIND_ORDER) groups.set(k, []);
  for (const t of tools) {
    if (!groups.has(t.kind)) groups.set(t.kind, []);
    groups.get(t.kind)!.push(t);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].filter(([, v]) => v.length > 0).map(([k, v]) => (
        <section key={k}>
          <header className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-ink-100">{KIND_LABEL[k]}</h2>
            <span className="text-xs text-ink-300">({v.length})</span>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {v.map((t) => (
              <ToolCard
                key={t.id}
                tool={t}
                selected={t.id === selectedId}
                onClick={() => onSelect(t.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-ink-300">{label}</span>
      <span className={good ? 'text-good font-medium' : 'text-ink-100 font-medium'}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ hasData, onClear }: { hasData: boolean; onClear: () => void }) {
  return (
    <div className="col-span-full text-center py-16 text-ink-200 text-sm">
      <div className="text-4xl mb-3 opacity-40">∅</div>
      {hasData ? (
        <>
          <p className="mb-3">No tools match your filters.</p>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs rounded-md bg-ink-700 border border-ink-400 hover:border-accent"
          >
            Clear filters
          </button>
        </>
      ) : (
        <p>No tools in catalog yet.</p>
      )}
    </div>
  );
}
