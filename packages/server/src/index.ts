import cors from 'cors';
import express from 'express';
import { performAction } from './actions.js';
import { allTools, findTool } from './catalog.js';
import { runDoctor } from './doctor.js';
import { currentPlatform } from './lib/platform.js';
import { getMetrics } from './metrics.js';
import { clearProbeCache, probeAll, probeOne } from './probe.js';
import {
  addCustomTool,
  CONFIG_PATH,
  loadSettings,
  removeCustomTool,
  saveSettings,
  setHidden,
} from './settings.js';
import type { ActionId, ToolDef } from './types.js';

const PORT = Number(process.env.PORT) || 4317;
const HOST = process.env.HOST || '127.0.0.1';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), platform: currentPlatform() });
});

app.get('/api/tools', async (req, res) => {
  const force = req.query.refresh === '1';
  if (force) clearProbeCache();
  const statuses = await probeAll(force);
  const byId = new Map(statuses.map((s) => [s.id, s]));
  const tools = allTools().map((t) => ({
    ...t,
    status: byId.get(t.id) ?? { id: t.id, installed: false, lastProbedAt: Date.now() },
  }));
  res.json({
    platform: currentPlatform(),
    tools,
    settings: loadSettings(),
  });
});

app.get('/api/tools/:id', async (req, res) => {
  const t = findTool(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  const status = await probeOne(t, req.query.refresh === '1');
  res.json({ ...t, status });
});

const VALID_ACTIONS: ActionId[] = [
  'start',
  'stop',
  'restart',
  'kill',
  'update',
  'check-update',
  'uninstall',
  'repair',
  'open-docs',
  'open-location',
];

app.post('/api/tools/:id/action', async (req, res) => {
  const action = req.body?.action as ActionId | undefined;
  if (!action || !VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `invalid action; one of ${VALID_ACTIONS.join(', ')}` });
  }
  const result = await performAction(req.params.id, action);
  res.json(result);
});

app.get('/api/tools/:id/metrics', async (req, res) => {
  const t = findTool(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  const status = await probeOne(t);
  if (!status.running || !status.pid) {
    return res.json({ running: false });
  }
  const m = await getMetrics(status.pid);
  res.json({ running: true, pid: status.pid, metrics: m });
});

// System-level doctor — runs cheap health checks across the host.
app.get('/api/system/doctor', async (_req, res) => {
  res.json(await runDoctor());
});

app.post('/api/system/fix', async (_req, res) => {
  // Today fix-system just runs the doctor and returns its findings. The UI
  // surfaces fix hints so the user can copy the command. We deliberately do
  // not auto-run system-changing commands here.
  res.json(await runDoctor());
});

// ── Settings endpoints ────────────────────────────────────────────────────

app.get('/api/settings', (_req, res) => {
  res.json({ ...loadSettings(), configPath: CONFIG_PATH });
});

app.patch('/api/settings', (req, res) => {
  const body = req.body ?? {};
  const next = saveSettings({
    hiddenIds: Array.isArray(body.hiddenIds) ? body.hiddenIds : loadSettings().hiddenIds,
    customTools: Array.isArray(body.customTools) ? body.customTools : loadSettings().customTools,
  });
  clearProbeCache();
  res.json(next);
});

app.post('/api/settings/hidden', (req, res) => {
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  res.json(setHidden(ids));
});

app.post('/api/settings/custom-tools', (req, res) => {
  const tool = req.body?.tool as ToolDef | undefined;
  if (!tool || !tool.id || !tool.name || !tool.bin) {
    return res.status(400).json({ error: 'tool must include id, name, and bin' });
  }
  clearProbeCache(tool.id);
  res.json(addCustomTool(tool));
});

app.delete('/api/settings/custom-tools/:id', (req, res) => {
  clearProbeCache(req.params.id);
  res.json(removeCustomTool(req.params.id));
});

app.listen(PORT, HOST, () => {
  console.log(`[tooldeck-server] http://${HOST}:${PORT}`);
  console.log(`[tooldeck-server] platform=${currentPlatform()} tools=${allTools().length}`);
  console.log(`[tooldeck-server] config=${CONFIG_PATH}`);
});
