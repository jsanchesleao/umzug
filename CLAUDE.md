# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Umzug is a client-only Progressive Web App for tracking apartments during a rental search (a "case file" per apartment: status, timeline of events, and follow-up actions). No backend, no auth, no analytics — all data lives on-device in IndexedDB, with JSON import/export as the only transfer mechanism. Deployed as a static site to GitHub Pages.

Full product/data-model spec: `SPEC.md`. Milestone tracker (what's shipped vs. outstanding): `ROADMAP.md` — all milestones (0–9) are complete; check it before assuming a feature is unbuilt.

## Commands

```
npm run dev        # Vite dev server
npm run build       # tsc -b && vite build (typecheck runs as part of build)
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint
npm run preview     # preview the production build
```

There is no test suite/framework configured in this repo.

CI (`.github/workflows/ci.yml`) runs typecheck → lint → build on every push/PR to `main`. Deploy (`.github/workflows/deploy.yml`) builds and publishes `dist/` to GitHub Pages on push to `main`.

## Architecture

**Persistence.** All data lives in IndexedDB via Dexie (`src/data/db.ts`), as four normalized stores — `apartments`, `timelineEvents`, `actions`, `photos` — keyed by `id` with indexes on foreign keys, rather than nested documents. This is deliberate: it lets "all unresolved actions across every apartment, sorted by urgency desc then due date asc" run as a single indexed query (`getUnresolvedActions` in `src/data/actions.ts`) instead of loading and flattening every apartment.

The Dexie schema is versioned in `db.ts` (`version(1)`, then `version(2)` with an `.upgrade()` migrating the old `rentCost` field into `coldRent`/`warmRent`). Future schema changes must add a new `.version(n)` block with its own upgrade function — never edit an existing version's `.stores()`/`.upgrade()` in place.

**Data access layer.** One file per entity in `src/data/` (`apartments.ts`, `timelineEvents.ts`, `actions.ts`, `photos.ts`) wraps all Dexie calls (CRUD + queries). Components should go through these functions rather than importing `db` and querying tables directly.

**Routing.** Exactly two routes — `/` (Dashboard) and `/apartments/:id` (ApartmentDetail) — via `react-router-dom`'s `BrowserRouter` with `basename={import.meta.env.BASE_URL}` (`src/App.tsx`). This basename matters because `vite.config.ts` sets `base: "/umzug/"` on build, since the app is served from a GitHub Pages subpath.

**Import/Export** (`src/data/importExport.ts`) uses a nested/denormalized JSON schema independent of the normalized DB tables (exact shape in `SPEC.md` §4.6). Notable behavior to preserve if touched:
- `normalizeLegacyRent` upconverts older exports that still carry a single `rentCost` field.
- Photo data-URL → `Blob` conversion (`dataUrlToBlob`, uses `fetch()`) happens *before* the Dexie `transaction(...)` block opens — awaiting a non-Dexie-tracked promise inside a Dexie transaction causes it to auto-commit early.
- Import is all-or-nothing per file; a single `overwrite`/`copy` collision-resolution choice applies to every colliding apartment in that batch.

**UI structure.** `src/pages/` holds the two route-level components; `src/components/` holds the Kanban board, per-entity modals/forms (apartment, timeline event, action, photo), and shared UI (Modal, ConfirmDialog, StatusBadge); `src/utils/` holds form-state/validation helpers per entity plus `date.ts`/`rent.ts`/`image.ts`. All entity types and enums (`ApartmentStatus`, `ActionUrgency`, `ActionStatus`, plus their label maps and list constants) live in `src/types.ts`.

**PWA.** `vite-plugin-pwa` is configured in `vite.config.ts` (manifest + Workbox precaching of the app shell) so the app is fully usable offline after first load.

**Settings.** App-wide settings (currently theme: light/dark/system) live outside Dexie, in `localStorage` under the `umzug:settings` key (`src/settings/SettingsContext.tsx`), separate from the four IndexedDB stores since they're device preferences rather than case-file data. `useSettings()` (`src/settings/useSettings.ts`) exposes `{ settings, updateSettings }` from context; the provider also resolves `"system"` against `matchMedia` and writes the resolved theme to `document.documentElement.dataset.theme` plus the `theme-color` meta tag.
