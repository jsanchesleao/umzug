# Umzug — Roadmap

Derived from `SPEC.md`. Organized as sequential milestones; each builds on the last. Items in the same milestone can be parallelized across contributors if needed.

## Milestone 0 — Groundwork & Decisions

Blocking, do first — cheap to fix now, expensive after UI/data model are built on top of wrong assumptions.

- [x] Resolve open questions from §8 with product owner (urgency scale naming, rent currency, visit-address behavior, import-collision default, timeline order, photos in/out of v1). Bake final answers back into SPEC.md.
- [x] Scaffold Vite + React + TypeScript project.
- [x] Set up `react-router` (or equivalent) with the two top-level routes (`/`, `/apartments/:id`), stubbed with placeholder pages.
- [x] Configure Vite `base` for the target GitHub Pages path; confirm dev build serves correctly from a subpath.
- [x] Set up linting/formatting and a minimal CI check (build + typecheck) — not in spec explicitly but de-risks everything downstream.

## Milestone 1 — Data Layer

Everything else depends on this being solid, since schema mistakes are expensive to migrate later.

- [x] Define TypeScript types for all entities/enums (§3.1, §3.2).
- [x] Set up Dexie.js schema: `apartments`, `timelineEvents`, `actions`, `photos` stores, indexed on `apartmentId` (and `eventId` on `actions`) (§3.3).
- [x] Write a thin data-access layer (CRUD functions per entity) — keeps components decoupled from Dexie calls directly.
- [x] Write the "unresolved actions across all apartments, sorted by urgency desc / dueDate asc" query — this is the one query the whole schema is optimized for; validate it works as a single indexed query.
- [x] Cascade-delete logic: deleting an apartment removes its events, actions, photos.

## Milestone 2 — Apartment CRUD & Dashboard Shell

- [x] Add/Edit Apartment modal (§4.3): fields, validation (required fields, positive rent, valid URL, conditional visit fields), create/update wiring to Dexie.
- [x] Dashboard Kanban board (§4.1B): 6 status columns, apartment cards (address, rent, entry date, status-specific detail, unresolved-actions badge).
- [x] Desktop layout: all 6 columns side by side.
- [x] Mobile layout: single-column view with a column switcher (tab bar/dropdown).
- [x] Floating action button opening the Add Apartment modal (§4.1C).
- [x] Status-change control for mobile (non-drag-and-drop path) — build this before drag-and-drop so status transitions work everywhere from day one.

## Milestone 3 — Apartment Case File

- [x] Case file route (§4.2): header (address, status badge, rent, link, entry date), conditional visit-info block.
- [x] Edit and Delete controls (delete requires confirmation + cascade, per Milestone 1's cascade logic).
- [x] Notes section (plain text editable).
- [x] Wire "Add Apartment" modal for edit mode reuse (same form, pre-filled).

## Milestone 4 — Timeline & Actions

- [x] Timeline event CRUD (§4.4): add/edit/delete, chronological ordering (pick and document oldest/newest-first per open question resolution).
- [x] Delete-event confirmation that names the count of actions that will cascade-delete.
- [x] Action CRUD (§4.5): create on apartment or on a specific event, edit fields, inline status-toggle control.
- [x] Unresolved-actions summary on the case file (§4.2), same sort rule as dashboard.
- [x] Unresolved Actions panel on the dashboard (§4.1A): collapsible, sorted, overdue flag, session-persisted collapse state.

At this point the core CRUD app is functionally complete end-to-end (create an apartment, move it through statuses, track events/actions) — good milestone for an internal dogfood pass.

## Milestone 5 — Drag-and-Drop & Filters

- [x] Desktop drag-and-drop between Kanban columns, with prompt for visit fields when entering/leaving `VisitScheduled`.
- [x] Dashboard filters: free-text search (address/notes) and overdue/unresolved toggle, in both desktop and mobile (behind filter icon) layouts.

## Milestone 6 — Import / Export

- [x] Single-apartment export (nested JSON per §4.6 schema).
- [x] Bulk export (array of the same shape).
- [x] Import: file picker, shape detection (array vs. single object), all-or-nothing transaction per file, error handling for malformed input.
- [x] ID-collision prompt (overwrite vs. import-as-copy, default per resolved open question).

## Milestone 7 — PWA & Deployment

- [x] Web app manifest (name, icons, standalone display, theme colors).
- [x] Service worker precaching via `vite-plugin-pwa`; verify full offline usability after first load.
- [x] GitHub Pages deployment pipeline; verify subpath asset/routing correctness.
- [x] Client-side-routing fallback for deep links (404.html or hash-routing workaround) — verify `/apartments/:id` loads directly, not just via in-app nav.

## Milestone 8 — Accessibility & Non-Functional Polish

- [ ] Keyboard operability: tab order, Escape to close modals, Enter to submit forms.
- [ ] Non-color status/urgency indicators (icon or text label alongside color).
- [ ] Performance check with a few hundred synthetic apartment records (bulk-import a generated dataset) to validate smoothness on mid-range hardware.
- [ ] Cross-browser smoke test: current Chrome, Edge, Firefox, Safari.

## Milestone 9 — Photos (committed for v1)

Resolved per SPEC §8.6: photos are in scope for v1, not deferred. Kept as its own milestone since it's independent of all other entities — no other entity depends on it — but it is no longer optional/descope-safe.

- [ ] Photo upload with downscale/compress before storage (~1600px longest edge, JPEG/WebP ~0.8 quality).
- [ ] Photos gallery on the case file.
- [ ] "Include photos" checkbox on export (default off for bulk, on for single-apartment), base64 data-URL embedding.

## Deferred / Out of Scope (per §7)

- QR-code transfer between devices (needs its own design spike — pairing handshake, not direct data encoding).
- Multi-user / sync / cloud backup.
- Multi-currency support.

---

**Suggested sequencing rationale:** data layer and open-question resolution gate everything (Milestones 0–1); the dashboard/case-file/timeline/actions form the functional core and should ship as one usable slice before polish (Milestones 2–4); drag-and-drop, import/export, and PWA packaging are additive layers on a working app (Milestones 5–7); accessibility polish and photos can trail without blocking a usable v1 (Milestones 8–9).
