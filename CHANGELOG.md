# Changelog

## v0.3.0 — 2026-05-13

### New features

- **Per-tool metrics** for running processes — CPU %, memory, uptime,
  PID — via [pidusage](https://github.com/soyuka/pidusage). Cross-platform
  (Windows / macOS / Linux). New endpoint `GET /api/tools/:id/metrics`.
- **Disk usage** for installed tools — sums the size of the binary's
  install root. Bounded scan (max 1.5 s / 30 k files / 12 levels deep),
  marks the result as `capped` when it stops early. Cached for 5 min.
- **View modes** in the dashboard: **Grid** (cards) · **List** (table
  with version / disk / CPU / mem / uptime columns) · **Grouped** (cards
  partitioned by kind with section headers). Toggle is in the header
  and persists in localStorage.
- **Maintenance section** in the detail panel with two destructive
  actions guarded by a confirmation modal:
  - **Uninstall** — runs the package manager's uninstall command
    (winget / brew / apt / choco / npm-g / pip / uv-tool / pipx).
  - **Repair** — forced reinstall through the same package manager.
- **Fix system** drawer — runs a built-in doctor: Node version, pnpm,
  Git, Docker, memory, disk free, plus winget / brew per platform.
  Shows OK / WARN / FAIL counts with copy-pastable fix hints. Endpoint
  `GET /api/system/doctor` (also `POST /api/system/fix`).
- **Metric panel** in the detail view: disk, CPU, memory, uptime, PID,
  and last-probe age as labelled tiles.
- **New keyboard shortcut:** `D` opens the system doctor drawer.

### API additions

- `GET  /api/tools/:id/metrics`
- `GET  /api/system/doctor`
- `POST /api/system/fix`
- `POST /api/tools/:id/action` now accepts `uninstall` and `repair`.

### Catalog / status changes

- `ToolStatus` gains `diskBytes`, `diskCapped`, and `metrics`.

## v0.2.1 — 2026-05-13

- **One-click launcher** — `Start ToolDeck.cmd` at the project root
  checks Node / pnpm, runs `pnpm install` on first run, starts the dev
  server, opens <http://127.0.0.1:4316>. On first run it also writes
  `Start ToolDeck.lnk` pointing at itself with the new custom icon, so
  the launcher shows a proper button in Explorer thereafter.
- **Custom icon** — multi-size `.ico` (16–256 px), shared across the
  source project, the installer's `Setup.lnk`, the local install-folder
  shortcut, and the Start Menu shortcut.

## v0.2.0 — 2026-05-13

- **Command palette (⌘K / Ctrl+K)** with fuzzy search; supports compound
  commands like `start docker`, `update node`, `check ripgrep`.
- **Settings modal (⌘,)** with tabs:
  - Appearance — light / dark theme, comfy / compact density
  - Behavior — auto-refresh interval (off / 15 s / 30 s / 1 m / 5 m),
    show / hide missing tools
  - Visibility — per-tool show / hide list
  - Custom tools — add or remove user-defined catalog entries, saved
    to `~/.tooldeck/config.json`
  - About — version + keyboard shortcuts cheat sheet
- **Persistent UI state** in `localStorage`: search, filters, selected
  tool, theme, density, auto-refresh.
- **Keyboard shortcuts:** `⌘K` palette, `⌘,` settings, `/` focus search,
  `R` refresh, `Esc` close modals.
- **Themed token system** — every surface uses CSS variables so light
  and dark mode work everywhere with no class swap.
- **Hide from dashboard** — quick hide button in the detail panel.
- **Toast banner** for the latest action result.
- **Server:** new endpoints `GET/PATCH /api/settings`,
  `POST /api/settings/custom-tools`, `DELETE /api/settings/custom-tools/:id`.
- **Output scrubbing** for winget progress-bar noise during
  check-update / update.

## v0.1.0 — 2026-05-13

- Initial release. 46-tool catalogue, cross-platform probe layer
  (Windows / macOS / Linux), Express API, React + Vite + Tailwind UI
  with grid + detail panel, Design / System sections.
