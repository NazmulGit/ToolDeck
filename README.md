# ToolDeck

> **v0.3.0** — Universal dashboard for viewing and managing the AI / dev
> / automation tools installed on a PC. Runs as a local web app — clone
> on any Windows, macOS, or Linux box, `pnpm start`, and open the browser.

Features:

- 46-tool curated catalog covering runtimes, package managers, AI CLIs,
  dev / cloud CLIs, services, and utilities
- Cross-platform probe (Windows / macOS / Linux) for version, running
  state, disk size, and live CPU / memory / uptime
- **Three view modes** — grid · list (table with metrics columns) ·
  grouped (cards partitioned by kind)
- **Command palette** (`⌘K`) — fuzzy search; compound commands like
  `start docker`, `update node`, `uninstall ngrok`
- **Settings** (`⌘,`) — light / dark theme, comfy / compact density,
  auto-refresh polling, hide tools, add custom tools
- **System actions** per tool — start · stop · restart · kill · check
  update · update · **uninstall** · **repair** · open docs · reveal
  location. Uninstall + repair go through a confirmation modal.
- **Fix system** doctor (`D`) — Node / pnpm / Git / Docker / memory /
  disk free / package-manager checks with copy-pastable fix hints
- Theme-aware via CSS variables; everything tints automatically

```
┌─────────────────────────────────────────────────────────────┐
│  UI :4316   ◄── REST ──►   Server :4317                     │
│  (React + Vite + Tailwind)  (Express + TS)                  │
│                                  │                          │
│                          probe layer (where / which,        │
│                          tasklist / pgrep, winget / brew)   │
└─────────────────────────────────────────────────────────────┘
```

## What it does

For each catalogued tool, ToolDeck shows two sections:

**Design**
- **View** — display name
- **Show** — installed / not installed, running / stopped, current version
- **Uses** — what the tool is for
- **Location** — absolute path on this machine
- **Where used** — contexts where this tool is invoked

**System**
- **Start** — spawn the service start command (where defined)
- **Stop** — graceful terminate by process name
- **Restart** — stop, wait, start
- **Kill** — force-terminate
- **Check update** — query the configured package manager
- **Update** — perform the upgrade through the package manager
- **Open docs** / **Reveal path** — convenience

## Quickstart

```sh
pnpm install
pnpm start         # server :4317 + UI :4316 in parallel
```

Then open http://127.0.0.1:4316. The UI proxies `/api/*` to the server.

### Requirements

- Node.js >= 20
- pnpm >= 9

### Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `pnpm start`        | Both packages' dev scripts in parallel        |
| `pnpm build`        | Builds server (tsc) and UI (tsc + vite)       |
| `pnpm typecheck`    | Typecheck both packages                       |
| `pnpm ui:dev`       | UI dev server only                            |
| `pnpm server:dev`   | API server only                               |

## Layout

```
tooldeck/
├── packages/
│   ├── ui/                  React + Vite + TS + Tailwind (port 4316)
│   └── server/              Node + Express + TS (port 4317)
├── package.json             Workspace root
└── pnpm-workspace.yaml
```

## How the catalog works

The catalog lives in `packages/server/src/catalog.ts`. Each entry is a
`ToolDef` describing where to look for the binary, how to ask its
version, what its `processName` is for service-status checks, and which
package manager handles updates. To add a tool, append to the array — no
schema migration needed.

```ts
{
  id: 'rg',
  name: 'ripgrep',
  kind: 'util',
  description: 'Fast recursive grep.',
  uses: 'Code search by agents and humans.',
  whereUsed: ['Claude Code Grep tool', 'editor search'],
  bin: { win32: 'rg.exe', darwin: 'rg', linux: 'rg' },
  versionFlag: '--version',
  update: { via: 'winget', pkgId: 'BurntSushi.ripgrep.MSVC' },
}
```

## Cross-platform behaviour

| Operation         | Windows                       | macOS / Linux         |
| ----------------- | ----------------------------- | --------------------- |
| Locate binary     | `where`                       | `command -v`          |
| Process check     | `tasklist /FI`                | `pgrep -x`            |
| Stop / kill       | `taskkill [/F] /IM ... /T`    | `pkill [-9] -x ...`   |
| Update            | `winget` / `choco` / `npm -g` | `brew` / `apt` / etc. |

Supported `update.via` values: `winget`, `choco`, `scoop`, `brew`,
`apt`, `npm-g`, `pip`, `uv-tool`, `pipx`, `self`.

## API

```
GET  /api/health
GET  /api/tools[?refresh=1]
GET  /api/tools/:id[?refresh=1]
POST /api/tools/:id/action       { "action": "start|stop|restart|kill|check-update|update|open-docs|open-location" }
```

The probe layer caches each tool's status for 15 s; pass `refresh=1` to
force a re-probe.

## Notes

- `start` only works for tools whose catalog entry defines
  `service.startCmd`; otherwise the action errors clearly. Most CLIs have
  no daemon to start.
- `update` runs the package manager non-interactively. On winget this
  uses `--silent --accept-package-agreements --accept-source-agreements`.
- Output from progress-heavy CLIs (winget) is scrubbed of progress-bar
  noise before being returned to the UI.
- The catalog is curated, not auto-discovered. Adding a tool is one
  ~10-line object in `catalog.ts`.
