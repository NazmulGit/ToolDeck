export type Platform = 'win32' | 'darwin' | 'linux';

export type ToolKind =
  | 'runtime'
  | 'pkg-manager'
  | 'ai-cli'
  | 'dev-cli'
  | 'service'
  | 'app'
  | 'util';

export type UpdaterId =
  | 'winget'
  | 'brew'
  | 'apt'
  | 'choco'
  | 'scoop'
  | 'npm-g'
  | 'pip'
  | 'uv-tool'
  | 'pipx'
  | 'self';

export interface ServiceSpec {
  type: 'systemd' | 'launchd' | 'windows-service' | 'process';
  name?: string;
  processName?: Partial<Record<Platform, string>> | string;
  startCmd?: Partial<Record<Platform, string>> | string;
  stopCmd?: Partial<Record<Platform, string>> | string;
  restartCmd?: Partial<Record<Platform, string>> | string;
}

export interface UpdateSpec {
  via: UpdaterId;
  pkgId?: string;
  selfCmd?: string;
}

export interface ToolDef {
  id: string;
  name: string;
  kind: ToolKind;
  description: string;
  uses: string;
  whereUsed: string[];
  bin: Partial<Record<Platform, string>> | string;
  versionFlag?: string;
  docsUrl?: string;
  homeUrl?: string;
  service?: ServiceSpec;
  update?: UpdateSpec;
  tags?: string[];
}

export interface ToolStatus {
  id: string;
  installed: boolean;
  path?: string;
  version?: string;
  running?: boolean;
  pid?: number;
  updateAvailable?: boolean;
  latestVersion?: string;
  lastProbedAt: number;
  probeError?: string;
}

export interface ToolView extends ToolDef {
  status: ToolStatus;
}

export type ActionId =
  | 'start'
  | 'stop'
  | 'restart'
  | 'kill'
  | 'update'
  | 'check-update'
  | 'open-docs'
  | 'open-location';

export interface ActionResult {
  ok: boolean;
  action: ActionId;
  toolId: string;
  message: string;
  stdout?: string;
  stderr?: string;
}
