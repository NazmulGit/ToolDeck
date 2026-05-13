import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ToolDef } from './types.js';

export const CONFIG_DIR = join(homedir(), '.tooldeck');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export interface ServerSettings {
  hiddenIds: string[];
  customTools: ToolDef[];
}

const DEFAULTS: ServerSettings = {
  hiddenIds: [],
  customTools: [],
};

let cache: ServerSettings | null = null;

export function loadSettings(): ServerSettings {
  if (cache) return cache;
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2));
    cache = { ...DEFAULTS };
    return cache;
  }
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    cache = {
      hiddenIds: Array.isArray(raw.hiddenIds) ? raw.hiddenIds : [],
      customTools: Array.isArray(raw.customTools) ? raw.customTools : [],
    };
    return cache;
  } catch (err) {
    console.warn('[settings] failed to parse, using defaults:', err);
    cache = { ...DEFAULTS };
    return cache;
  }
}

export function saveSettings(next: ServerSettings): ServerSettings {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  cache = {
    hiddenIds: Array.isArray(next.hiddenIds) ? next.hiddenIds : [],
    customTools: Array.isArray(next.customTools) ? next.customTools : [],
  };
  writeFileSync(CONFIG_PATH, JSON.stringify(cache, null, 2));
  return cache;
}

export function addCustomTool(tool: ToolDef): ServerSettings {
  const s = loadSettings();
  const idx = s.customTools.findIndex((t) => t.id === tool.id);
  if (idx >= 0) s.customTools[idx] = tool;
  else s.customTools.push(tool);
  return saveSettings(s);
}

export function removeCustomTool(id: string): ServerSettings {
  const s = loadSettings();
  s.customTools = s.customTools.filter((t) => t.id !== id);
  return saveSettings(s);
}

export function setHidden(ids: string[]): ServerSettings {
  const s = loadSettings();
  s.hiddenIds = [...new Set(ids)];
  return saveSettings(s);
}
