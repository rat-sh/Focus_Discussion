# Live vs mock

Switch is only `VITE_USE_MOCK` in `.env.local` (read in `src/config/env.ts`).

| Flag | What you see |
|------|----------------|
| `true` (default) | In-memory mock data. Yellow “Prototype data” bar. Demo user. No login. |
| `false` | Supabase only. No mock, no prototype bar, no demo shortcuts. Sign up / sign in required. |

Never falls back: live mode cannot load `src/data/mock`.

## Live setup

1. Create a Supabase project. For local testing, Auth → turn off “Confirm email” if you want immediate signup; when enabled, signup clearly asks users to confirm via email before signing in.
2. Copy `server/.env.example` to `server/.env`, then set `DATABASE_URL` and `DATABASE_URL_ADMIN` to the project's direct PostgreSQL connection string. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the project values.
3. Run the numbered migrations in order with `bun run db:migrate`. Do not run only the newest migration in the Supabase SQL editor: for example, migration 14 requires migration 08 to have created `room_whiteboard_strokes`. If applying through the SQL editor instead, execute the numbered files from `01` upward in order. This is the only database setup path; there is no bundled `supabase.sql`, seed step, or reset command. Use a fresh Supabase project. The old custom-user migration history is incompatible with this Supabase Auth chain; do not run this against a database with those migrations applied.
4. Set `.env.local`:

```
VITE_USE_MOCK=false
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

5. In `server/.env`, set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to your LiveKit deployment. Set server-only `YOUTUBE_API_KEY` to enable in-app video search; the API proxies YouTube Data API requests and never sends this key to the browser. Keep all server credentials server-side. Valkey must be available for the fail-closed limits on live writes.
6. Start the API and web app in two terminals: run `bun run --cwd server dev` first, then `bun run dev`. Check `http://localhost:8787/healthz` for the API process and `http://localhost:8787/readyz` for dependencies; `/readyz` must return `{"ok":true,"postgres":true,"valkey":true}`. If the web app reports an API 502, the API is not reachable. If rate-limited room APIs report that the rate limiter is unavailable, Valkey must be started/reachable; live writes fail closed without it.

In Supabase **Authentication → URL Configuration**, add the app origins you actually use to Redirect URLs, including `http://localhost:5173/reset-password` and `http://127.0.0.1:5173/reset-password` for local development and `https://YOUR_APP_DOMAIN/reset-password` for production. Password recovery redirects to the current app origin; Supabase must allow it. The sign-in screen links to password recovery, which emails a one-time reset link and then lets the user choose a new password.

Use the **anon** key only in the browser. Do not add a Supabase service-role key to either client environment. LiveKit video/audio needs a reachable LiveKit server. YouTube playback uses the embed and does not need an API key; search appears only when the server has `YOUTUBE_API_KEY` configured.

The API validates bearer tokens through Supabase Auth; it does not store passwords, custom access tokens, or refresh-token rows in the application database.

## Live features

- Room video/audio and participant presence use LiveKit; chat is persisted in Postgres and delivered over its reliable data channel.
- Live room keeps the approved content/speaker/gallery layout, room panels, invite actions, and slash commands; the paged gallery supports 20 participant tiles per desktop page.
- Whiteboard strokes, custom hex colors, clear, and per-user undo are persisted; changes are sent as LiveKit data events, while late joiners and reconnecting clients load the canonical board from Postgres. Board notes can be downloaded as SVG.
- Shared YouTube playback state is stored per room and sent as LiveKit data events; in-app search uses the server-only `YOUTUBE_API_KEY` proxy when configured.
- Schedule supports upcoming sessions and organizer create/update/cancel for rooms the user belongs to.
- Avatar files use signed uploads into the public `avatars` bucket, limited to 5 MiB and JPEG/PNG/WebP.
- PDFs are stored in the private `study-materials` bucket, limited to 25 MiB and PDF MIME type. Materials can be personal or shared with a selected room; room members can read shared files, while only the uploader can edit or remove them.
- Profile, rooms, friends, materials, and focus records continue to use the existing live repositories.

### Numbered migrations

`v2_sql/` is the single ordered migration chain. The two-digit prefix defines application order; each migration owns one feature's schema, RLS policies, and grants. The chain targets Supabase Auth (`auth.users`) and Supabase Storage.

| Migration | Feature |
| --- | --- |
| `01_extensions.sql` | PostgreSQL extensions |
| `02_profiles.sql` | Supabase Auth profiles and signup trigger |
| `03_rooms.sql` | Rooms, memberships, and room RPCs |
| `04_friends.sql` | Friend requests and social RPCs |
| `05_focus.sql` | Focus sessions, plans, segments, and statistics |
| `06_materials.sql` | Study materials |
| `07_live_chat.sql` | Persisted room chat |
| `08_live_whiteboard.sql` | Persisted whiteboard strokes |
| `09_live_playback.sql` | Shared playback state |
| `10_schedule.sql` | Scheduled room sessions |
| `11_avatar_storage.sql` | Avatar Storage bucket and policies |
| `12_function_permissions.sql` | RPC execution grants |
| `13_material_storage.sql` | Private PDF storage and room-shared material RLS |
| `14_whiteboard_custom_colors.sql` | Validate custom whiteboard hex colors |

### Manual verification

1. Sign up with a valid name, username, email, and 10+ character password. If email confirmation is enabled, follow the confirmation link before signing in.
2. From sign-in, use **Forgot password?**, request a reset email, open its link, and save a new 10+ character password.
3. Open the app as two distinct Supabase users, create/join the same room, and enter it in both browsers.
4. On the room invite screen, switch on the camera and/or mic before joining. The browser will ask for permission; allow it and verify the local video tile and mic state. Turn either device off there to join without granting its permission.
5. Verify audio/video tiles and the People tab update when either user joins or leaves.
6. Send chat from both browsers; verify immediate delivery and that history returns after refresh/reconnect.
7. Draw from each browser, select a preset or custom board color, join a third browser late, then test Undo mine and Clear all from both clients.
8. Set a YouTube URL in Music; test play, pause, and seek from each browser and verify the other player follows. Set `YOUTUBE_API_KEY` in `server/.env` to reveal in-app search; search and choose a result, then verify the shared player updates in both browsers.
9. Schedule a future session in a joined room, edit/cancel it as its organizer, then verify the empty state after cancellation.
10. Upload, replace, and remove a supported avatar; verify an unsupported type or file over 5 MiB is rejected.
11. Upload a PDF to a personal library and to a room. Verify the room member can open the shared PDF, a non-member cannot, and PDFs over 25 MiB are rejected.
12. Open Focus Lock in live mode, grant camera permission, and start a tracked session. Confirm the banner reports on-device detection, then briefly leave frame and return, close eyes for several seconds, or show a phone while looking down to observe the timeline colors. Verify that camera/model initialization errors are surfaced and saved as untracked. Frames are never sent to the backend; only focus segments are persisted.

Face Lock uses the on-device MediaPipe Face Landmarker and EfficientDet-Lite0 phone detector. Its thresholds are initial estimates and require calibration across devices and lighting; it reports apparent presence/behavior, not attention or learning comprehension.
