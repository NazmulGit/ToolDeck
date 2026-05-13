import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type Density = 'comfy' | 'compact';
export type ViewMode = 'grid' | 'list' | 'group';

export interface UISettings {
  theme: Theme;
  density: Density;
  viewMode: ViewMode;
  autoRefreshSec: number;       // 0 = off
  showMissing: boolean;
  search: string;
  kindFilter: string;
  statusFilter: string;
  selectedId: string | null;
}

const STORAGE_KEY = 'tooldeck.ui.v1';

export const DEFAULT_SETTINGS: UISettings = {
  theme: 'dark',
  density: 'comfy',
  viewMode: 'grid',
  autoRefreshSec: 0,
  showMissing: true,
  search: '',
  kindFilter: 'all',
  statusFilter: 'all',
  selectedId: null,
};

export function loadSettings(): UISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UISettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: UISettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}

export function useSettings(): [UISettings, (patch: Partial<UISettings>) => void] {
  const [settings, setSettings] = useState<UISettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.dataset.theme = settings.theme;
    if (settings.theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, [settings]);

  const update = (patch: Partial<UISettings>) => setSettings((s) => ({ ...s, ...patch }));
  return [settings, update];
}
