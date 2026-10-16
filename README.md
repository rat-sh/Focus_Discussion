# Focus Lock

Study rooms for friend groups and anyone who wants to teach. Live room, session folders, friends, study library,
and **Focus Lock** (quality-over-quantity study timer with on-device face tracking).
This is the clean, mobile-first frontend. Local development defaults to isolated mock data; production uses the live Supabase repositories.

## Run
```
bun install
bun run dev          # http://localhost:5173 (mock data by default)
bun run build        # typecheck + production build
bun test             # unit tests (scoring, classifier, helpers)
```
Use Bun as the only package manager. `package-lock.json` was removed on purpose; `bun.lock` is the project lockfile.

Live backend is **Supabase**. See `docs/BACKEND.md`: set `VITE_USE_MOCK=false` plus project URL and anon key, configure the server database connection, and apply the numbered `v2_sql/` migrations with `bun run db:migrate`.
Demo controls (`/focus/session?demo=1`) exist only in `bun run dev`, or in a build made with `VITE_ENABLE_DEMO=true`. They are absent from production builds.
Demo room codes: `DSA-482` (open), `FULL-001` (full), `OLD-404` (expired).

## Supabase Auth URL configuration
In Supabase Dashboard → Authentication → URL Configuration, set **Site URL** to `https://focus-discussion.onrender.com` and add `https://focus-discussion.onrender.com/**` under **Redirect URLs**. The app uses its current origin for signup confirmation and password-reset redirects.

## Structure
```
src/
  app/            App shell, routes, providers
  config/         brand name (rename the product in one place)
  domain/         types + pure logic (focus scoring). No React, no I/O.
  data/           repositories.ts = the ONLY contract the UI uses
    mock/         mock implementations + seed data  <- delete when going live
    index.ts      single switch: export Supabase repos here
    hooks.ts      useResource (async data hook)
  features/       one folder per screen/feature (home, rooms, room, focus, friends, materials, ...)
    focus/engine/ attention engine contract, classifier, mock engine
  shared/
    ui/           Button, Dialog, Tabs, Field, Toggle, Toast, Panel, Feedback, StateChip, Avatar
    context/      theme, profile, command palette
    hooks, lib/   media query, formatting, image resize
  styles/         design tokens (CSS variables) + Tailwind theme
design/           Figma export kept for reference (original + syntax-fixed). Not used by the code
docs/             specs and contracts (below)
scripts/          ui-audit.py
```
Rules: features import from `@/data`, `@/domain`, `@/shared` only. No mock data inside components. No raw hex colours outside `styles/index.css` and the avatar palette.

## Going live (remove mock data)
1. Implement each interface in `src/data/repositories.ts` with Supabase (one query per method, see `docs/DATA_CONTRACT.md`).
2. Export them from `src/data/index.ts` instead of `mockRepos`.
3. Delete `src/data/mock/`. Nothing else changes.

## Docs
- `docs/DATA_CONTRACT.md` tables, per-screen queries, realtime, security. Input for the Supabase SQL.
- `docs/PHASE2_SPEC.md` navigation, journeys, responsive specs, Focus Lock rules and scoring (current).
- `docs/FOCUS_LOCK.md` Focus Lock behavior, color thresholds, privacy, and detector limitations.
- `docs/UX_RULES.md` design and mobile rules, and the review checklist.

## Not built yet (on purpose)
Consent and delete-history screens, room-level focus sharing over realtime, and offline resume of a focus session after a reload. See `docs/FOCUS_LOCK.md` for Face Lock behavior and limitations.
