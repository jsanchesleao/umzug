# Umzug — Implementation Specification

Status: Draft v1 — derived from `pitch.md`. Open questions are called out in §8; resolve them before or during sprint planning.

## 1. Overview

Umzug is a client-only Progressive Web App for tracking apartments during a rental search. Each apartment is a "case file" with status, timeline of events, and follow-up actions. No backend: all data lives on-device (IndexedDB), with JSON import/export for backup and transfer between devices. Deployed as a static site to GitHub Pages; installable as a PWA.

## 2. Tech Stack & Architecture

- **Framework:** React + TypeScript, built with Vite.
- **Routing:** client-side router (e.g. `react-router`), top-level routes: Dashboard (`/`), Apartments (`/apartments`), Apartment Detail (`/apartments/:id`), Tasks (`/tasks`), Task Detail (`/tasks/:id`), and Documents (`/documents`).
- **Persistence:** IndexedDB, accessed through a wrapper (e.g. `Dexie.js`) rather than the raw API — needed for schema versioning/migrations as the app evolves.
- **PWA:** `vite-plugin-pwa` (or equivalent) for manifest + service worker generation, precaching the app shell for full offline use after first load.
- **Deployment:** static build published to GitHub Pages. Vite `base` config must match the repo's Pages path; all internal routing/asset references must work under that subpath.
- **State management, drag-and-drop, date handling, form library:** left to the dev team's discretion; not prescribed by this spec.

No authentication, no server, no analytics/telemetry — all processing and storage is local to the browser. (The one carve-out: the encrypted documents vault (§4.8) is gated by a local password, which is a key-derivation secret for on-device encryption, not an account.)

## 3. Data Model

### 3.1 Enums

```ts
type ApartmentStatus =
  | "AwaitingVisitation"
  | "VisitScheduled"
  | "Visited"
  | "AwaitingResponse"
  | "Confirmed"
  | "Cancelled";

type ActionUrgency = "Low" | "Medium" | "High" | "Critical"; // see §8, open question

type ActionStatus = "Unresolved" | "Resolved" | "Cancelled";

type TaskStatus = "ToDo" | "InProgress" | "Finished" | "Cancelled";
```

### 3.2 Entities

**Apartment**
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `title` | string | required; primary label for the case file (Kanban card, case-file header) |
| `address` | string | optional |
| `coldRent` | number \| null | optional; base rent excluding extra costs; currency not modeled, see §8 |
| `warmRent` | number \| null | optional; rent including heating/water/other costs; currency not modeled, see §8 |
| `originalLink` | string (URL) | optional; must be a syntactically valid URL if provided |
| `entryDate` | ISO date | required; defaults to today on creation |
| `status` | `ApartmentStatus` | required; defaults to `AwaitingVisitation` |
| `visitDate` | ISO datetime \| null | required when `status === "VisitScheduled"` |
| `visitAddress` | string \| null | required when `status === "VisitScheduled"`; defaults to `address` but editable (meeting point may differ) |
| `notes` | string | free text, optional |
| `createdAt` / `updatedAt` | ISO datetime | system-managed |

**TimelineEvent** (belongs to one Apartment)
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `apartmentId` | string | FK |
| `date` | ISO date | required |
| `shortDescription` | string | required |
| `longDescription` | string \| null | optional |
| `createdAt` / `updatedAt` | ISO datetime | system-managed |

**Action** (belongs to one Apartment, and optionally to one TimelineEvent within it)
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `apartmentId` | string | FK, always set |
| `eventId` | string \| null | FK to TimelineEvent; null if attached directly to the apartment |
| `description` | string | required |
| `dueDate` | ISO date | required |
| `urgency` | `ActionUrgency` | required |
| `status` | `ActionStatus` | defaults to `Unresolved` |
| `createdAt` / `updatedAt` | ISO datetime | system-managed |

**Photo** (belongs to one Apartment) — optional feature, see §4.7
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `apartmentId` | string | FK |
| `blob` | Blob | the image data |
| `caption` | string \| null | optional |
| `createdAt` | ISO datetime | system-managed |

**Task** — a standalone case file for generic to-dos, independent of any apartment
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `title` | string | required |
| `description` | string | free text, optional |
| `status` | `TaskStatus` | required; defaults to `ToDo` |
| `createdAt` / `updatedAt` | ISO datetime | system-managed |

**TaskEvent** (belongs to one Task) — same shape as `TimelineEvent`, keyed by `taskId` instead of `apartmentId`.

**TaskAction** (belongs to one Task, and optionally to one TaskEvent within it) — same shape as `Action` (reuses `ActionUrgency`/`ActionStatus`), keyed by `taskId` instead of `apartmentId`.

### 3.3 Storage schema

Store as separate IndexedDB object stores (`apartments`, `timelineEvents`, `actions`, `photos`, `tasks`, `taskEvents`, `taskActions`), each keyed by `id`, with indexes on the foreign keys (`apartmentId`/`taskId`, and `eventId` on `actions`/`taskActions`). Rationale: the dashboard needs "all unresolved actions across every apartment, sorted by urgency then due date" — a normalized `actions` store lets this run as a single indexed query instead of loading and flattening every apartment document. Tasks mirror this exact rationale with their own parallel stores rather than sharing the apartment tables, so cascading deletes and unresolved-action queries stay independent per entity type; the dashboard combines both `status`-indexed queries and re-sorts the merged result.

Documents (§4.8) deliberately live **outside** IndexedDB, in the browser's Origin Private File System under `umzug-docs/`: `vault.json` (plaintext KDF metadata), `index.enc` (the encrypted index), and `blobs/<uuid>` (encrypted document bytes in one flat directory). They reference and are referenced by nothing in the Dexie stores.

## 4. Features

### 4.1 Dashboard (`/`)

Two stacked sections plus a floating action button.

**A. Unresolved Actions panel**
- Collapsible list, all `Action` and `TaskAction` records with `status === "Unresolved"` across all apartments and tasks, merged into one list.
- Sort: `urgency` descending (Critical → Low) as primary key, `dueDate` ascending as secondary key, applied across the merged set.
- Each row shows: description, parent apartment or task title (linking to its case file), due date, urgency badge. Overdue items (`dueDate < today`) are visually flagged (e.g. red text/icon) independent of sort position.
- Collapsed/expanded state persists across navigation within a session (not required to persist across reloads).

**B. Kanban board**
- One column per `ApartmentStatus` (6 columns), cards = apartment summary (title, address in smaller type if present, rent, entry date, status-specific detail — see below, and a badge if it has unresolved actions).
- Desktop (≥ some breakpoint, e.g. 768px): all 6 columns visible side by side, plus filter controls: free-text search (matches title/address/notes) and a toggle to show only apartments with overdue/unresolved actions.
- Mobile: only one column visible at a time; a tab bar or dropdown selects which status/column is shown. Same filter controls available, collapsed into the mobile layout (e.g. behind a filter icon).
- Cards for `VisitScheduled` apartments additionally show `visitDate` and `visitAddress`.
- Moving a card between columns (drag-and-drop on desktop; explicit status-change control on mobile, since drag-and-drop is unreliable on touch) updates `status` and, when moving into/out of `VisitScheduled`, prompts for/clears `visitDate`/`visitAddress` as needed.

**C. Floating action button**
- Fixed-position button, always visible on the dashboard, opens the "Add Apartment" modal (§4.3).

**Acceptance criteria**
- Given two unresolved actions with urgencies High and Critical, when the dashboard loads, then the Critical action is listed first regardless of due dates.
- Given two unresolved actions both with urgency Medium but different due dates, when the dashboard loads, then the one due sooner is listed first.
- Given an apartment with status `VisitScheduled`, when viewing its Kanban card, then the visit date and visit address are visible on the card without opening the case file.
- Given a viewport narrower than the desktop breakpoint, when the dashboard loads, then exactly one Kanban column is visible and a control exists to switch columns.
- Given the FAB is tapped/clicked, when the modal opens, then it matches the "Add/Edit Apartment" behavior in §4.3.

### 4.2 Apartment Case File (`/apartments/:id`)

- Header: title, address (if present), status badge, rent, clickable original link (if present, opens in new tab), entry date.
- If `status === "VisitScheduled"`: a visible block with visit date and visit address.
- Unresolved-actions summary: all `Action`s where `apartmentId` matches this apartment (whether attached to the apartment directly or to one of its events) and `status === "Unresolved"`, same sort rule as §4.1A.
- Timeline: chronological (oldest first or newest first — dev team's choice, but must be consistently ordered and labeled) list of events; each event displays date, short description, and — if present — an expandable long description, plus any actions attached to it.
- Notes: free-text editable section (plain text is sufficient; markdown rendering is a nice-to-have, not required).
- Edit and Delete controls for the apartment itself (delete requires confirmation and cascades to its events, actions, and photos).
- "Export this file" control (see §4.6).
- Photos gallery, if §4.7 is in scope for the initial build.

**Acceptance criteria**
- Given an apartment not in `VisitScheduled` status, when viewing its case file, then no visit date/address block is shown.
- Given an apartment with 3 unresolved actions (2 on the apartment, 1 on a timeline event) and 1 resolved action, when viewing its case file, then exactly the 3 unresolved actions are listed in the summary, correctly sorted.
- Given the delete control is used, when confirmed, then the apartment and all its events/actions/photos are removed from IndexedDB, and the user is returned to the dashboard.

### 4.3 Add / Edit Apartment (modal)

- Single modal form (opened from FAB for "add", or from an edit control for "edit"), styled as a quick-create form (reference point: Jira's "create issue" modal — compact, doesn't navigate away from the current view).
- Fields: title*, address, coldRent, warmRent, originalLink, entryDate* (defaults to today), status* (defaults to `AwaitingVisitation`), visitDate/visitAddress (shown conditionally when status is `VisitScheduled`), notes.
- Client-side validation: `title` is the only always-required identifying field; `address` and `originalLink` are optional; `coldRent`/`warmRent` are optional but, if provided, must be non-negative numbers (either or both may be left blank, displayed as "Unknown" elsewhere in the UI); `originalLink`, if provided, must be a syntactically valid URL; `visitDate`/`visitAddress` required if and only if status is `VisitScheduled`.
- On submit, apartment is created/updated in IndexedDB and the modal closes; dashboard/case file reflects the change immediately (no reload).

**Acceptance criteria**
- Given the status field is set to `VisitScheduled`, when the form re-renders, then visit date and visit address inputs appear and become required.
- Given a required field is empty on submit, then the form blocks submission and shows an inline error on that field.
- Given valid data is submitted from the FAB modal, when saved, then a new Kanban card appears in the column matching the chosen status without a full page reload.

### 4.4 Timeline management

- From a case file, user can add a new event (date*, short description*, long description) via a modal or inline form.
- Existing events can be edited or deleted (delete requires confirmation; also deletes any actions attached to that event, after warning the user how many actions will be removed).

**Acceptance criteria**
- Given an event with 2 attached actions, when the user attempts to delete it, then a confirmation dialog states that 2 actions will also be deleted before proceeding.

### 4.5 Actions management

- Actions can be created either directly on an apartment or attached to a specific timeline event, from their respective views.
- Editable fields: description, dueDate, urgency, status. (`apartmentId`/`eventId` are not user-editable after creation.)
- Status transitions are unrestricted between `Unresolved`, `Resolved`, `Cancelled` (any state to any other), performed via the edit form or a quick inline control (e.g. checkbox/button on the action row).

**Acceptance criteria**
- Given an unresolved action, when its status is set to `Resolved` via the inline control, then it immediately disappears from both the dashboard's unresolved-actions panel and its parent apartment's unresolved-actions summary.

### 4.6 Import / Export

- **Export — single apartment:** from the case file, downloads one JSON file containing that apartment plus its nested timeline events and actions (see export schema below).
- **Export — bulk:** from the dashboard, downloads one JSON file containing an array of all apartments in the same nested shape.
- **Import:** file picker accepts a JSON file in either the single-apartment or bulk shape (bulk = array, single = one object — importer must detect which). For each imported apartment:
  - If its `id` does not match any existing apartment, it is inserted as a new record.
  - If its `id` matches an existing apartment, the user is prompted to either overwrite the existing record or import it as a new copy (new generated `id`). Default/recommended choice: import as a new copy, to avoid silent data loss.
- **Export JSON schema** (nested/denormalized, independent of the internal normalized DB tables):
```json
{
  "id": "…", "title": "…", "address": "…", "coldRent": 0, "warmRent": null, "originalLink": "…",
  "entryDate": "…", "status": "…", "visitDate": null, "visitAddress": null,
  "notes": "…", "createdAt": "…", "updatedAt": "…",
  "timeline": [
    { "id": "…", "date": "…", "shortDescription": "…", "longDescription": null,
      "actions": [ { "id": "…", "description": "…", "dueDate": "…", "urgency": "…", "status": "…" } ] }
  ],
  "actions": [ { "id": "…", "description": "…", "dueDate": "…", "urgency": "…", "status": "…" } ],
  "photos": [ { "id": "…", "caption": null, "dataUrl": "data:image/…;base64,…" } ]
}
```
(`actions` here = actions attached directly to the apartment, i.e. `eventId === null`; each timeline event carries its own `actions` array.)

**Acceptance criteria**
- Given a single-apartment export is re-imported into the same browser/database, when the import completes, then the user is prompted about the ID collision and, on choosing "import as copy," a second apartment appears with identical field values but a different `id`.
- Given a bulk export of N apartments, when imported into an empty database, then exactly N apartments (with all nested events/actions) exist afterward.
- Given a malformed/non-matching JSON file is selected, when import is attempted, then the app shows an error and makes no database changes (all-or-nothing per file).

### 4.6a Peer-to-Peer Transfer (PeerJS + QR pairing)

Direct device-to-device transfer, layered on top of the same export/import schema (§4.6) so no new payload format exists — a QR code is used only as a pairing handshake, never to encode data directly (see §7 history).

- **Pairing:** the sending device ("host") generates a short 6-character code and registers it with PeerJS's public signaling broker; it displays a QR code (encoding a link with the code), the plain code, and a copyable link. The receiving device ("guest") obtains the code by scanning the QR, pasting the link, or typing the code manually, then dials the host directly over WebRTC.
- **Scope:** sender chooses, at share time, between sending a single apartment (mirrors §4.6's single-apartment export) or all apartments (mirrors bulk export).
- **Data path:** once the WebRTC data channel opens, the host sends the same JSON shape as a file export; the guest runs it through the same `parseImportPayload`/`detectCollisions`/`importApartments` pipeline used for file import, including the same overwrite/copy collision prompt. The host receives an acknowledgement so it can show a real outcome rather than a blind "sent".
- **Trade-off:** only ephemeral pairing metadata (short-lived peer IDs) touches PeerJS's public broker for signaling; the apartment data itself flows directly between the two devices over an encrypted WebRTC channel and never touches that broker or any other third party.

### 4.7 Photos (feasibility note + scope)

IndexedDB supports storing `Blob`/`File` values directly (structured-clone algorithm), so photos can be attached to an apartment without base64-encoding overhead in the local database — this is viable and is the recommended storage approach (a `photos` object store, per §3.3).

Constraints to build in regardless of whether this ships in v1:
- Downscale/compress images on upload (e.g. cap longest edge at ~1600px, re-encode as JPEG/WebP at ~0.8 quality) before storing, to keep per-photo size and export-file size reasonable.
- JSON export must embed photos as base64 data URLs (there's no binary JSON format), which will make export files significantly larger when photos are included. Recommend exposing an "include photos" checkbox on export (default off for bulk export, on for single-apartment export) rather than always embedding them.
- This feature can be descoped from v1 without affecting the rest of the data model — `photos` is an independent store with no other entity depending on it.

### 4.8 Encrypted Documents Vault (`/documents`)

A dedicated Documents page for securely storing and transferring rental-application paperwork — PDF files and images only, each with an optional text description. Fully independent of the apartment data model.

- **Password & crypto:** first visit requires setting a password (min 8 characters, confirmed, with an explicit unrecoverability warning). PBKDF2-SHA256 (600,000 iterations, random 16-byte salt) derives an AES-GCM-256 *vault key* that encrypts a JSON index. Every stored document is encrypted with its own freshly generated AES-GCM-256 key; every encryption uses a fresh random 12-byte IV prepended to the ciphertext. Per-document keys, original file names, descriptions, and virtual paths live only inside the encrypted index. A wrong password surfaces as an AES-GCM auth-tag failure decrypting the index. The vault key exists only in memory while unlocked (lock control in the page menu; reload locks implicitly).
- **Storage:** OPFS layout per §3.3 — encrypted blobs are named by random UUID in one flat directory.
- **Virtual folders:** the folder tree exists only in the index (`folders[]` list plus per-entry `folder` path, so empty folders are representable). Rename/move of files or whole folders is a pure index rewrite; blobs never move. Names are kept unique per folder (` (2)` suffixing).
- **Operations:** upload (restricted to `application/pdf` and `image/*`), inline viewing (image / embedded PDF), edit name + description, move, delete (confirmed), download single files, and download any multi-selection — including entire folders — as one zip that preserves the virtual subtree layout.
- **P2P transfer:** reuses the §4.6a pairing mechanics (host code + QR / link / manual entry) but on a separate peer-ID prefix and `?p2pdoc=` link param, so apartment and document sessions can never cross-connect. The sender picks single documents or entire folders; documents travel decrypted over the DTLS-encrypted WebRTC channel in 256 KiB chunks with backpressure and progress reporting on both ends. The receiver chooses a destination folder first (creating folders on the fly if desired), re-encrypts each document with fresh keys into its own vault as it completes, and acks only after everything is persisted.
- **Password management:** change password re-encrypts only the index (document keys are untouched); a double-confirmed reset (confirm dialog + typing `DELETE`) destroys the entire vault and is the only recovery path for a forgotten password.

**Acceptance criteria**
- Given no vault exists, when the user opens `/documents`, then they must create a password before any documents can be stored.
- Given a locked vault, when a wrong password is entered, then a "Wrong password." error is shown and nothing decrypts.
- Given a non-PDF/non-image file is selected for upload, then it is skipped with an error naming the file and no entry is created for it.
- Given a folder is renamed or moved, then only `index.enc` changes — the encrypted blobs in OPFS are untouched.
- Given a multi-selection including a folder is downloaded, then a single zip is produced whose internal paths mirror the virtual subtree.
- Given documents are sent to a second device, then the receiver picks a destination folder before pairing, both sides see transfer progress, the received copies open from the receiver's own vault, and the sender shows a delivered count only after the receiver persisted everything.
- Given the vault is locked or the page is reloaded, then documents are unreadable until the password is entered again.

### 4.9 Tasks (`/tasks`, `/tasks/:id`)

A second, independent case-file entity for tracking generic to-dos that aren't tied to any apartment — a title, a description, an optional timeline of `TaskEvent`s, and an optional list of `TaskAction`s, moving through its own 4-state workflow (`ToDo` → `InProgress` → `Finished`/`Cancelled`, unrestricted transitions like `ActionStatus`).

- **Tasks page (`/tasks`)** mirrors the Apartments page: search/filter/sort, a List/Kanban view toggle (one column per `TaskStatus`, native drag-and-drop), and a FAB opening the Add Task modal. Unlike apartment status changes, no `TaskStatus` transition needs extra fields, so moving a task (via drag or the status menu) commits immediately with no intermediate modal.
- **Task Detail page (`/tasks/:id`)** mirrors the Apartment Case File: header (title, status badge/menu, `⋮` menu for Edit/Export/Send/Delete), unresolved-actions summary, an editable description section, the task's timeline, and its action list. No photos/sketches — those are apartment-specific.
- **Import/Export/P2P:** Tasks have their own independent JSON export schema (`ExportedTask`, nested `timeline`/`actions` exactly like `ExportedApartment`'s shape in §4.6) and their own `parseTaskImportPayload`/`detectTaskCollisions`/`importTasks` pipeline — not merged into an apartments export file. P2P transfer reuses the §4.6a pairing mechanics but on a separate peer-ID prefix (`umzugtask-`) and `?p2ptask=` link param, so apartment, task, and document (§4.8) pairing sessions can never cross-connect.
- **Dashboard integration:** unresolved `TaskAction`s appear in the same merged Unresolved Actions panel as apartment actions (§4.1A), not a separate panel.

## 5. PWA & Deployment Requirements

- Valid web app manifest (name, icons at standard sizes, `display: standalone`, theme colors) so the app is installable on desktop and mobile ("Add to Home Screen").
- Service worker precaches the app shell; after first successful load, the app (including previously-loaded apartment data, since it's all local) must be fully usable with no network connection.
- Build output deployable as-is to GitHub Pages; verify all routes and asset paths work when served from a non-root subpath (`https://<user>.github.io/<repo>/`), including a client-side-routing fallback (Pages has no server-side rewrite, so deep links like `/apartments/:id` need a 404.html or hash-routing workaround).

**Acceptance criteria**
- Given the app has been loaded once, when the device is put into airplane mode and the app is reopened, then the dashboard and previously-created apartments still load and remain editable.
- Given the app is deployed to GitHub Pages, when a user navigates directly to an apartment's URL (not via in-app navigation), then the correct case file loads rather than a 404.

## 6. Non-Functional Requirements

- No backend, no network calls required for core functionality; no user accounts/authentication (the documents-vault password of §4.8 is a local encryption secret, not an account).
- All data stays on-device; nothing is transmitted anywhere by the app itself.
- Target smooth performance up to a few hundred apartment records with typical timeline/action counts (tens of events/actions each) on mid-range mobile hardware.
- Supported browsers: current versions of Chrome, Edge, Firefox, Safari (all support IndexedDB and Service Workers).
- Modals and forms must be keyboard-operable (tab order, Escape to close, Enter to submit) and status/urgency indicators must not rely on color alone (add icon or text label) for accessibility.

## 7. Out of Scope / Future Work

- ~~QR-code transfer between desktop and mobile PWA~~ — shipped as §4.6a: QR is used as a pairing handshake for a PeerJS/WebRTC transfer channel (not to encode data directly, since a QR code can't hold a meaningful JSON payload), reusing the §4.6 export/import schema and pipeline unchanged.
- Multi-user / sync / cloud backup.
- Currency handling beyond a plain number (see §8).

## 8. Assumptions & Open Questions (Resolved)

All open questions below were resolved with the product owner during Milestone 0 planning (2026-07-13). Original assumptions are kept for history; each now has a final answer.

1. **Urgency scale** — pitch only says "urgency" with no defined levels. Assumed: `Low / Medium / High / Critical`.
   **Resolved:** keep `Low / Medium / High / Critical` as specified.
2. **Rent currency** — `rentCost` is a bare number with no currency field. Assumed single implicit currency (user's local currency); add a `currency` field later if the user searches across currencies.
   **Resolved:** keep as a bare number, no currency field for v1.
3. **Visit address vs. apartment address** — assumed these can legitimately differ (e.g. leasing office vs. unit address), so `visitAddress` is a separate editable field defaulting to `address`.
   **Resolved:** keep as a separate editable field defaulting to `address`.
4. **Import ID-collision behavior** — assumed "prompt, default to import-as-copy."
   **Resolved:** prompt on collision, default selection is import-as-copy.
5. **Timeline order** (oldest-first vs. newest-first) — left as an implementation choice.
   **Resolved:** oldest-first (chronological).
6. **Photos** — in scope for v1 or deferred? Storage approach is specified either way (§4.7).
   **Resolved:** in scope for v1 (see ROADMAP.md Milestone 9 note — no longer deferred/optional).
