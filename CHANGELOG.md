# Changelog

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
