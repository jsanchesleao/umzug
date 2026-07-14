---
name: verify
description: How to build, launch, and drive Umzug to verify a change end-to-end in a real browser.
---

# Verifying Umzug changes

## Launch

- `npm run dev` (background). Vite picks the next free port if 5173 is busy — read the "Local:" line from the output to get the actual port. Dev base is `/` (the `/umzug/` base only applies to production builds).
- Routes: `/` Dashboard, `/apartments` list/kanban page, `/apartments/:id` detail.

## Drive (Playwright)

- Playwright is not a project dep. Install it in the session scratchpad: `npm init -y && npm install playwright && npx playwright install chromium`, then run a `.mjs` script with `node`.
- A fresh Playwright browser context has an empty IndexedDB — seed data through the UI:
  - Add apartment: click `.fab`, fill `#title` / `#address`, submit `.modal button[type=submit]`.
  - Add action (makes the apartment "unresolved"): open detail via the row/card title link, click `+ Add action`, fill `#action-description` and `#action-dueDate` (both required), submit.
- Useful selectors: `.apartment-row` (list rows), `.apartment-card` (kanban cards), `.badge-unresolved` (unresolved count badge), `.filter-status-trigger` (status filter dropdown), view toggle `button:has-text('List')` / `button:has-text('Kanban')`.

## Gotchas

- The user often has their own dev server running on 5173/5174 with different code — always verify against the port your own `npm run dev` reports.
- Kill the dev server when done: find the PID via `netstat -ano | grep :<port> | grep LISTENING`, then `taskkill //PID <pid> //F` (Git Bash).
