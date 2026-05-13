import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionId, ToolView } from '../types';

interface Props {
  tools: ToolView[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onAction: (id: string, action: ActionId) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

type Item =
  | { type: 'tool'; tool: ToolView; score: number }
  | { type: 'global'; id: string; label: string; hint?: string; run: () => void };

const GLOBAL_COMMANDS: { id: string; label: string; hint?: string; keys?: string[] }[] = [
  { id: 'refresh', label: 'Refresh all probes', hint: 'R', keys: ['refresh', 'reload', 'probe'] },
  { id: 'settings', label: 'Open settings', hint: '⌘,', keys: ['settings', 'options', 'preferences', 'theme'] },
];

function score(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500;
  if (t.includes(q)) return 200;
  // tiny fuzzy: every q char appears in order
  let i = 0;
  for (const c of t) {
    if (c === q[i]) i++;
    if (i === q.length) return 50;
  }
  return 0;
}

export function CommandPalette({ tools, onClose, onSelect, onAction, onOpenSettings, onRefresh }: Props) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const lowq = q.toLowerCase();
    // Tool entries
    for (const t of tools) {
      const sName = score(q, t.name);
      const sId = score(q, t.id);
      const sDesc = q ? score(q, t.description) : 0;
      const sUses = q ? score(q, t.uses) : 0;
      const sTags = (t.tags ?? []).reduce((m, tag) => Math.max(m, score(q, tag)), 0);
      const s = Math.max(sName, sId, sDesc * 0.5, sUses * 0.4, sTags * 0.7);
      if (s > 0) out.push({ type: 'tool', tool: t, score: s + (t.status.installed ? 1 : 0) });
    }
    // Action shortcuts: e.g. "start docker", "update node"
    const actionWords: { word: string; action: ActionId }[] = [
      { word: 'start', action: 'start' },
      { word: 'stop', action: 'stop' },
      { word: 'restart', action: 'restart' },
      { word: 'kill', action: 'kill' },
      { word: 'update', action: 'update' },
      { word: 'check', action: 'check-update' },
      { word: 'docs', action: 'open-docs' },
      { word: 'reveal', action: 'open-location' },
    ];
    for (const aw of actionWords) {
      if (!lowq.startsWith(aw.word + ' ')) continue;
      const rest = q.slice(aw.word.length + 1);
      for (const t of tools) {
        const s = Math.max(score(rest, t.name), score(rest, t.id));
        if (s > 0) {
          out.push({
            type: 'global',
            id: `${aw.action}-${t.id}`,
            label: `${aw.word} → ${t.name}`,
            hint: aw.action,
            run: () => onAction(t.id, aw.action),
          });
        }
      }
    }
    // Globals
    for (const g of GLOBAL_COMMANDS) {
      const s = Math.max(
        score(q, g.label),
        ...(g.keys ?? []).map((k) => score(q, k)),
      );
      if (s > 0) {
        out.push({
          type: 'global',
          id: g.id,
          label: g.label,
          hint: g.hint,
          run: g.id === 'refresh' ? onRefresh : onOpenSettings,
        });
      }
    }
    out.sort((a, b) => (b.type === 'tool' ? b.score : 100) - (a.type === 'tool' ? a.score : 100));
    return out.slice(0, 40);
  }, [q, tools, onAction, onOpenSettings, onRefresh]);

  useEffect(() => { setCursor(0); }, [q]);

  const choose = (item: Item) => {
    if (item.type === 'tool') onSelect(item.tool.id);
    else item.run();
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-3 pb-2 border-b border-line">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              else if (e.key === 'Enter') { const it = items[cursor]; if (it) choose(it); }
            }}
            placeholder="Type a tool name, or “start docker”, “update node”, “settings”…"
            className="w-full bg-transparent text-base outline-none placeholder:text-ink-300"
          />
          <div className="flex items-center justify-between pt-2 text-[11px] text-ink-300">
            <div className="flex gap-3">
              <span><span className="kbd">↑↓</span> navigate</span>
              <span><span className="kbd">↵</span> select</span>
              <span><span className="kbd">Esc</span> close</span>
            </div>
            <span>{items.length} results</span>
          </div>
        </div>
        <div className="max-h-[55vh] overflow-auto scroll-thin p-1">
          {items.length === 0 && (
            <div className="px-3 py-6 text-sm text-ink-300">No matches.</div>
          )}
          {items.map((it, i) => (
            <button
              key={it.type === 'tool' ? it.tool.id : it.id}
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(it)}
              className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 ${
                i === cursor ? 'bg-ink-700' : 'hover:bg-ink-700/50'
              }`}
            >
              {it.type === 'tool' ? (
                <>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      it.tool.status.running ? 'bg-accent' : it.tool.status.installed ? 'bg-good' : 'bg-ink-400'
                    }`}
                  />
                  <span className="text-sm">{it.tool.name}</span>
                  <span className="text-xs text-ink-300">{it.tool.description}</span>
                  <span className="ml-auto text-[10px] text-ink-300 uppercase">{it.tool.kind}</span>
                </>
              ) : (
                <>
                  <span className="text-sm">{it.label}</span>
                  {it.hint && <span className="ml-auto kbd">{it.hint}</span>}
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
