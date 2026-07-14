# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Umzug is a client-only Progressive Web App for tracking apartments during a rental search (a "case file" per apartment: status, timeline of events, and follow-up actions). No backend, no auth, no analytics — all data lives on-device in IndexedDB. Data moves between devices via JSON file import/export, or directly device-to-device over a PeerJS/WebRTC connection paired with a QR code. Deployed as a static site to GitHub Pages.

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

**Peer-to-peer transfer** (`src/data/p2p.ts`, `SPEC.md` §4.6a) layers a PeerJS/WebRTC data channel on top of the same `ExportedApartment` schema instead of inventing a new payload format — the sender `JSON.stringify`s the same export shape used by file export and sends it over the data channel; the receiver runs it through the *same* `parseImportPayload`/`detectCollisions`/`importApartments` pipeline used for file import, unchanged. A QR code (or manual code/link fallback) is only ever a pairing handshake — it encodes a short peer ID, never the apartment data itself. Only that ephemeral pairing metadata touches PeerJS's public signaling broker; the actual data flows directly between the two devices over an encrypted WebRTC channel and never touches the broker, which is the one place this app's "no backend, all data on-device" positioning brushes up against a third party.

**Documents vault** (`/documents`, `SPEC.md` §4.8) is the one subsystem that does *not* use Dexie: PDFs/images live encrypted in OPFS under `umzug-docs/` (`vault.json` plaintext KDF meta, `index.enc` encrypted JSON index, `blobs/<uuid>` flat encrypted files). Crypto is in `src/data/docCrypto.ts` (PBKDF2-SHA256 600k iters → AES-GCM-256 vault key for the index; a fresh random AES-GCM key per document, stored base64 inside the encrypted index; every ciphertext is `IV || data`, fresh 12-byte IV). OPFS I/O is `src/data/docStorage.ts`, orchestration `src/data/documentVault.ts`, and the unlocked state (CryptoKey held in a ref, never persisted) lives in `src/documents/VaultProvider.tsx` + `useVault()`. Folder structure is entirely virtual — paths live in the index (`src/utils/docPaths.ts` has the pure rewrite helpers); rename/move never touches blobs. Document P2P transfer (`src/data/p2pDocs.ts`) reuses `p2p.ts` pairing on a separate `umzugdoc-` peer prefix / `?p2pdoc=` param and streams plaintext in 256 KiB chunks with `bufferedAmount` backpressure; the receiver re-encrypts with its own fresh keys. Wrong password = AES-GCM auth-tag failure decrypting the index; the only recovery for a forgotten password is the destructive vault reset.

**UI structure.** `src/pages/` holds the two route-level components; `src/components/` holds the Kanban board, per-entity modals/forms (apartment, timeline event, action, photo), and shared UI (Modal, ConfirmDialog, StatusBadge); `src/utils/` holds form-state/validation helpers per entity plus `date.ts`/`rent.ts`/`image.ts`. All entity types and enums (`ApartmentStatus`, `ActionUrgency`, `ActionStatus`, plus their label maps and list constants) live in `src/types.ts`.

**PWA.** `vite-plugin-pwa` is configured in `vite.config.ts` (manifest + Workbox precaching of the app shell) so the app is fully usable offline after first load.

**Settings.** App-wide settings (currently theme: light/dark/system) live outside Dexie, in `localStorage` under the `umzug:settings` key (`src/settings/SettingsContext.tsx`), separate from the four IndexedDB stores since they're device preferences rather than case-file data. `useSettings()` (`src/settings/useSettings.ts`) exposes `{ settings, updateSettings }` from context; the provider also resolves `"system"` against `matchMedia` and writes the resolved theme to `document.documentElement.dataset.theme` plus the `theme-color` meta tag.
