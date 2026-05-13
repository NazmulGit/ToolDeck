# Changelog

## v0.3.1 + portable exe — 2026-05-13

- **Single-file `tooldeck.exe` build.** New `pnpm exe` script builds the
  UI, embeds every asset as base64 into `packages/server/src/generated/ui-bundle.ts`,
  then runs `bun build --compile` to produce a ~114 MB self-contained
  Windows binary at `dist-exe/tooldeck.exe`. The .exe includes a
  custom-icon resource via `--windows-icon`.
- **Asset middleware in the server.** `staticHandler()` serves the
  embedded UI bundle whenever it's non-empty. In dev the bundle is
  empty and Vite still owns the UI on :4316 — same source, two
  deployment shapes.
- New entry point `packages/server/src/bun-entry.ts`. Boots the regular
  server then opens the system browser. Honours `TOOLDECK_NO_OPEN=1`
  for headless / smoke-test runs.

## v0.3.1 — 2026-05-13

UX upgrade pass for the list view + dashboard.

- **Sortable columns** in the list view. Click any header to cycle
  asc → desc → unsorted. Active column shows a chevron in the accent
  colour. Implements WAI-ARIA `aria-sort` and wraps the label in a
  `<button>` for keyboard activation (Tab + Space/Enter).
- **Sort persists** in `localStorage` alongside the rest of UI state.
- **Sort respected by every view mode** — grid and grouped reorder
  too. A small `sorted by <key> ▲ / ✕` chip surfaces the current
  sort outside the list view, with a one-click clear.
- **Status-aware "status" sort key** orders running > installed >
  missing.
- **Sticky list header** stays visible while the body scrolls.
- **Keyboard navigation**: `↑ / ↓` step through the visible tools and
  update the detail panel — works in any view mode.
- **Undefined-last** convention: rows with no version / no metrics
  always sort to the bottom regardless of direction (expected
  data-table behaviour).

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
