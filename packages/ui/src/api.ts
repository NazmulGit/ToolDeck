import type { ActionId, ActionResult, DoctorReport, Platform, ServerSettings, ToolView } from './types';

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

async function jsend<T>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

export interface ListResp {
  platform: Platform;
  tools: ToolView[];
  settings: ServerSettings;
}

export const api = {
  list: (refresh = false) => jget<ListResp>(`/api/tools${refresh ? '?refresh=1' : ''}`),
  get: (id: string, refresh = false) =>
    jget<ToolView>(`/api/tools/${id}${refresh ? '?refresh=1' : ''}`),
  action: (id: string, action: ActionId) =>
    jsend<ActionResult>(`/api/tools/${id}/action`, 'POST', { action }),
  settings: () => jget<ServerSettings & { configPath: string }>(`/api/settings`),
  patchSettings: (patch: Partial<ServerSettings>) =>
    jsend<ServerSettings>(`/api/settings`, 'PATCH', patch),
  addCustomTool: (tool: unknown) =>
    jsend<ServerSettings>(`/api/settings/custom-tools`, 'POST', { tool }),
  removeCustomTool: (id: string) =>
    jsend<ServerSettings>(`/api/settings/custom-tools/${encodeURIComponent(id)}`, 'DELETE'),
  doctor: () => jget<DoctorReport>(`/api/system/doctor`),
};
