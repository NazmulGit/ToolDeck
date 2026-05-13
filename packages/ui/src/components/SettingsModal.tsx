import { useMemo, useState } from 'react';
import { api } from '../api';
import type { ServerSettings, ToolView } from '../types';
import type { UISettings } from '../lib/settings';

interface Props {
  uiSettings: UISettings;
  onUISettings: (patch: Partial<UISettings>) => void;
  serverSettings: ServerSettings;
  tools: ToolView[];
  onClose: () => void;
  onChanged: () => void;
}

type Tab = 'appearance' | 'behavior' | 'visibility' | 'custom' | 'about';

export function SettingsModal({ uiSettings, onUISettings, serverSettings, tools, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('appearance');

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-panel" style={{ width: 'min(820px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <h2 className="text-base font-semibold">Settings</h2>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-100 text-sm">✕</button>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-0 min-h-[420px]">
          <nav className="border-r border-line p-2 space-y-0.5 text-sm">
            <TabButton id="appearance" active={tab} onClick={setTab}>Appearance</TabButton>
            <TabButton id="behavior" active={tab} onClick={setTab}>Behavior</TabButton>
            <TabButton id="visibility" active={tab} onClick={setTab}>Visibility</TabButton>
            <TabButton id="custom" active={tab} onClick={setTab}>Custom tools</TabButton>
            <TabButton id="about" active={tab} onClick={setTab}>About</TabButton>
          </nav>
          <div className="p-5 overflow-auto scroll-thin max-h-[60vh]">
            {tab === 'appearance' && (
              <Section title="Appearance">
                <Field label="Theme">
                  <Toggle
                    options={[{ id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }]}
                    value={uiSettings.theme}
                    onChange={(v) => onUISettings({ theme: v as any })}
                  />
                </Field>
                <Field label="Density">
                  <Toggle
                    options={[{ id: 'comfy', label: 'Comfy' }, { id: 'compact', label: 'Compact' }]}
                    value={uiSettings.density}
                    onChange={(v) => onUISettings({ density: v as any })}
                  />
                </Field>
              </Section>
            )}
            {tab === 'behavior' && (
              <Section title="Behavior">
                <Field label="Auto-refresh" hint="0 disables polling. Shorter intervals cost more CPU.">
                  <select
                    value={uiSettings.autoRefreshSec}
                    onChange={(e) => onUISettings({ autoRefreshSec: Number(e.target.value) })}
                    className="px-2 py-1 rounded-md bg-ink-700 border border-ink-400 text-sm"
                  >
                    <option value={0}>Off</option>
                    <option value={15}>15 s</option>
                    <option value={30}>30 s</option>
                    <option value={60}>1 min</option>
                    <option value={300}>5 min</option>
                  </select>
                </Field>
                <Field label="Show missing tools" hint="Hide entries that are not installed on this machine.">
                  <Toggle
                    options={[{ id: 'yes', label: 'Show' }, { id: 'no', label: 'Hide' }]}
                    value={uiSettings.showMissing ? 'yes' : 'no'}
                    onChange={(v) => onUISettings({ showMissing: v === 'yes' })}
                  />
                </Field>
              </Section>
            )}
            {tab === 'visibility' && (
              <VisibilityTab tools={tools} hiddenIds={serverSettings.hiddenIds} onChanged={onChanged} />
            )}
            {tab === 'custom' && (
              <CustomToolsTab serverSettings={serverSettings} onChanged={onChanged} />
            )}
            {tab === 'about' && (
              <Section title="About ToolDeck">
                <p className="text-sm text-ink-200 mb-3">
                  Universal dashboard for viewing and managing the AI / dev /
                  automation tools installed on a PC.
                </p>
                <Field label="Version">v0.2.1</Field>
                <Field label="Server">http://127.0.0.1:4317</Field>
                <Field label="UI">http://127.0.0.1:4316</Field>
                <Field label="Shortcuts">
                  <div className="text-xs text-ink-200 grid grid-cols-2 gap-y-1 gap-x-4">
                    <div><span className="kbd">⌘K</span> command palette</div>
                    <div><span className="kbd">⌘,</span> settings</div>
                    <div><span className="kbd">/</span> focus search</div>
                    <div><span className="kbd">R</span> refresh</div>
                    <div><span className="kbd">Esc</span> close modals</div>
                  </div>
                </Field>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, active, onClick, children }: { id: Tab; active: Tab; onClick: (id: Tab) => void; children: React.ReactNode }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full text-left px-3 py-2 rounded-md ${
        active === id ? 'bg-ink-700 text-ink-100' : 'text-ink-200 hover:bg-ink-700/40'
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-ink-300 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{label}</div>
      {hint && <div className="text-xs text-ink-300 mb-1.5">{hint}</div>}
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  options, value, onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-ink-400 bg-ink-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1 text-xs rounded ${
            value === o.id ? 'bg-accent text-white' : 'text-ink-200 hover:text-ink-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function VisibilityTab({ tools, hiddenIds, onChanged }: { tools: ToolView[]; hiddenIds: string[]; onChanged: () => void }) {
  const [filter, setFilter] = useState('');
  const set = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const sorted = useMemo(
    () => [...tools].sort((a, b) => a.name.localeCompare(b.name)),
    [tools],
  );
  const filtered = sorted.filter((t) =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase()) || t.id.toLowerCase().includes(filter.toLowerCase()),
  );
  async function toggle(id: string) {
    const next = set.has(id) ? hiddenIds.filter((x) => x !== id) : [...hiddenIds, id];
    await api.patchSettings({ hiddenIds: next });
    onChanged();
  }
  return (
    <Section title="Hide tools from view">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        className="w-full px-2.5 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-sm"
      />
      <div className="text-xs text-ink-300">{set.size} hidden of {tools.length}</div>
      <div className="border border-line rounded-md divide-y divide-line max-h-[42vh] overflow-auto scroll-thin">
        {filtered.map((t) => {
          const hidden = set.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className="w-full px-3 py-2 flex items-center gap-3 text-sm text-left hover:bg-ink-700/40"
            >
              <span className={`inline-block w-2 h-2 rounded-full ${t.status.installed ? 'bg-good' : 'bg-ink-400'}`} />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-[10px] text-ink-300 uppercase">{t.kind}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${
                hidden
                  ? 'border-ink-400 bg-ink-700 text-ink-200'
                  : 'border-accent/40 bg-accent/15 text-accent'
              }`}>
                {hidden ? 'hidden' : 'visible'}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function CustomToolsTab({ serverSettings, onChanged }: { serverSettings: ServerSettings; onChanged: () => void }) {
  const [form, setForm] = useState({
    id: '', name: '', description: '', uses: '', whereUsed: '', binWin: '', binMac: '', binLin: '', versionFlag: '--version', kind: 'dev-cli', docsUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!form.id.trim() || !form.name.trim()) {
      setError('id and name are required'); return;
    }
    const tool = {
      id: form.id.trim(),
      name: form.name.trim(),
      kind: form.kind,
      description: form.description.trim() || '(no description)',
      uses: form.uses.trim() || '(no usage notes)',
      whereUsed: form.whereUsed.split(/\n|;/).map((s) => s.trim()).filter(Boolean),
      bin: {
        win32: form.binWin.trim() || form.id.trim() + '.exe',
        darwin: form.binMac.trim() || form.id.trim(),
        linux: form.binLin.trim() || form.id.trim(),
      },
      versionFlag: form.versionFlag.trim() || undefined,
      docsUrl: form.docsUrl.trim() || undefined,
    };
    try {
      setSaving(true);
      await api.addCustomTool(tool);
      onChanged();
      setForm({ ...form, id: '', name: '', description: '', uses: '', whereUsed: '', binWin: '', binMac: '', binLin: '', docsUrl: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.removeCustomTool(id);
    onChanged();
  }

  return (
    <Section title="Custom tools">
      <p className="text-xs text-ink-300">
        Saved to <code className="kbd">~/.tooldeck/config.json</code>. These show
        up in the grid alongside the built-in catalog.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="id" value={form.id} onChange={(v) => setForm({ ...form, id: v })} placeholder="e.g. mytool" />
        <Input label="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="My Tool" />
        <Input label="bin (Windows)" value={form.binWin} onChange={(v) => setForm({ ...form, binWin: v })} placeholder="mytool.exe" />
        <Input label="bin (macOS / Linux)" value={form.binMac} onChange={(v) => { setForm({ ...form, binMac: v, binLin: v }); }} placeholder="mytool" />
        <Input label="version flag" value={form.versionFlag} onChange={(v) => setForm({ ...form, versionFlag: v })} placeholder="--version" />
        <SelectField
          label="kind"
          value={form.kind}
          onChange={(v) => setForm({ ...form, kind: v })}
          options={['runtime', 'pkg-manager', 'ai-cli', 'dev-cli', 'service', 'app', 'util']}
        />
        <Input label="description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="One-line summary" col={2} />
        <Input label="uses" value={form.uses} onChange={(v) => setForm({ ...form, uses: v })} placeholder="What it's used for" col={2} />
        <Input label="docs URL" value={form.docsUrl} onChange={(v) => setForm({ ...form, docsUrl: v })} placeholder="https://…" col={2} />
      </div>
      {error && <div className="text-bad text-xs">{error}</div>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={saving}
          className="px-3 py-1.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add tool'}
        </button>
      </div>
      {serverSettings.customTools.length > 0 && (
        <div className="border border-line rounded-md divide-y divide-line">
          {serverSettings.customTools.map((t: any) => (
            <div key={t.id} className="px-3 py-2 flex items-center gap-3 text-sm">
              <span className="flex-1 truncate"><span className="font-medium">{t.name}</span> <span className="text-ink-300 text-xs">{t.id}</span></span>
              <button onClick={() => remove(t.id)} className="text-bad text-xs hover:underline">Remove</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Input({ label, value, onChange, placeholder, col }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; col?: number }) {
  return (
    <div className={col === 2 ? 'col-span-2' : ''}>
      <div className="text-xs text-ink-200 mb-0.5">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-sm"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <div className="text-xs text-ink-200 mb-0.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-md bg-ink-700 border border-ink-400 text-sm"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
