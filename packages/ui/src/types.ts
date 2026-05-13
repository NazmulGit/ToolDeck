// Mirrors @tooldeck/server types — kept inline to avoid a shared package.

export type Platform = 'win32' | 'darwin' | 'linux';
export type ToolKind =
  | 'runtime'
  | 'pkg-manager'
  | 'ai-cli'
  | 'dev-cli'
  | 'service'
  | 'app'
  | 'util';

export interface ToolMetrics {
  cpu: number;
  memoryBytes: number;
  uptimeMs: number;
  startedAt?: number;
  pid: number;
}

export interface ToolStatus {
  id: string;
  installed: boolean;
  path?: string;
  version?: string;
  running?: boolean;
  pid?: number;
  diskBytes?: number;
  diskCapped?: boolean;
  metrics?: ToolMetrics;
  updateAvailable?: boolean;
  latestVersion?: string;
  lastProbedAt: number;
  probeError?: string;
}

export interface ToolView {
  id: string;
  name: string;
  kind: ToolKind;
  description: string;
  uses: string;
  whereUsed: string[];
  bin: Record<Platform, string> | string;
  versionFlag?: string;
  docsUrl?: string;
  homeUrl?: string;
  service?: { type: string; processName?: any };
  update?: { via: string; pkgId?: string; selfCmd?: string };
  tags?: string[];
  status: ToolStatus;
}

export type ActionId =
  | 'start'
  | 'stop'
  | 'restart'
  | 'kill'
  | 'update'
  | 'check-update'
  | 'uninstall'
  | 'repair'
  | 'open-docs'
  | 'open-location';

export type DoctorCheckStatus = 'ok' | 'warn' | 'fail';
export interface DoctorCheck {
  id: string;
  label: string;
  status: DoctorCheckStatus;
  message: string;
  fixHint?: string;
}
export interface DoctorReport {
  checks: DoctorCheck[];
  summary: { ok: number; warn: number; fail: number };
}

export interface ServerSettings {
  hiddenIds: string[];
  customTools: any[];
}

export interface ActionResult {
  ok: boolean;
  action: ActionId;
  toolId: string;
  message: string;
  stdout?: string;
  stderr?: string;
}
