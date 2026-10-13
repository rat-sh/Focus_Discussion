# Worktree audit

Audit performed against the current worktree diff, not prior-session intent. No source files were changed by this audit; this report is the only file created.

## Files

Git snapshot: `git status --short --untracked-files=all` showed 50 tracked paths modified/deleted and 115 untracked files. `git diff --stat` reports 50 tracked files, 791 insertions and 2,554 deletions. It does not include untracked files. The deleted `package-lock.json` accounts for 2,292 of those deleted lines. The untracked files contain approximately 10,692 text lines (including the new `bun.lock`; binary files excluded). Adding tracked insertions gives roughly 11,483 added text lines, not counting any binary assets.

The actual recent log (`git log --oneline -10`) contains three commits:

```text
732c35a docs: phase 2 specification
a08c9da phase2: honest UI (remove no-op controls and false toasts), profile URLs, join gate, dev-only demo, hedged focus copy, full-width audit
9fb6f72 baseline: studyroom-web as delivered before Phase 2
```

Tracked changes (line counts are Git numstat added/removed lines; current binary/zero-stat files are called out):

| Path | What it does | Status | Approx. lines |
|---|---|---:|---:|
| `.gitignore` | Ignores local env files while allowing example env files | changed | +4/-0 |
| `README.md` | Main project setup and usage documentation | changed | +7/-11 |
| `docs/FOCUS_LOCK.md` | Documents focus-tracking constraints and product decisions | changed | +14/-10 |
| `package-lock.json` | npm dependency lockfile | deleted | -2,292 |
| `package.json` | Scripts, workspaces, runtime and development dependencies | changed | +24/-2 |
| `public/favicon.svg` | Browser favicon asset | changed | SVG; numstat 0/0 |
| `src/app/App.tsx` | Root providers and route/auth composition | changed | +38/-28 |
| `src/data/hooks.ts` | Async resource loading hook | changed | +2/-2 |
| `src/data/index.ts` | Chooses mock or live repository implementation | changed | +6/-3 |
| `src/data/mock/focus.ts` | In-memory mock focus plans and records | changed | +3/-1 |
| `src/data/mock/library.ts` | In-memory mock materials and schedule behavior | changed | +24/-2 |
| `src/data/mock/rooms.ts` | In-memory mock room operations | changed | +11/-0 |
| `src/data/repositories.ts` | Shared repository interfaces and domain contracts | changed | +6/-2 |
| `src/domain/__tests__/focus.test.ts` | Focus-domain unit tests | changed | +8/-4 |
| `src/domain/focus.ts` | Focus-session calculations and domain logic | changed | +2/-2 |
| `src/domain/types.ts` | Shared application domain types | changed | +6/-1 |
| `src/features/focus/FocusSessionPage.tsx` | Focus session UI and completion behavior | changed | +18/-11 |
| `src/features/focus/FocusSetupPage.tsx` | Focus session setup UI | changed | +31/-14 |
| `src/features/focus/LinkViewer.tsx` | Safe material/link preview and embedding | changed | +57/-12 |
| `src/features/focus/engine/classify.ts` | Maps camera-derived signals into focus states | changed | +6/-6 |
| `src/features/focus/engine/index.ts` | Selects the focus detection engine | changed | +3/-2 |
| `src/features/focus/engine/mockEngine.ts` | Simulated focus engine for mock mode | changed | +1/-0 |
| `src/features/focus/engine/types.ts` | Focus engine input/output contract | changed | +2/-2 |
| `src/features/focus/planStore.ts` | Session-storage plan/draft persistence | changed | +39/-3 |
| `src/features/focus/useCamera.ts` | Camera permission and stream lifecycle hook | changed | +9/-8 |
| `src/features/focus/useFocusSession.ts` | Focus clock, state transitions, engine lifecycle | changed | +61/-13 |
| `src/features/friends/FriendsPage.tsx` | Friend discovery and request UI | changed | +4/-3 |
| `src/features/home/HomePage.tsx` | Home dashboard and recent rooms/sessions | changed | +4/-4 |
| `src/features/join/JoinPage.tsx` | Room preview and join workflow | changed | +47/-6 |
| `src/features/materials/MaterialsPage.tsx` | Personal/room material list and add flow | changed | +59/-13 |
| `src/features/music/MusicProvider.tsx` | App-wide YouTube music player | changed | +29/-8 |
| `src/features/room/BoardStage.tsx` | Room whiteboard stage wrapper | changed | +1/-1 |
| `src/features/room/ControlBar.tsx` | Room control buttons and accessibility labels | changed | +4/-3 |
| `src/features/room/InviteDialog.tsx` | Room invite link and sharing UI | changed | +3/-1 |
| `src/features/room/OtherStages.tsx` | Room material stage and stage selection | changed | +4/-4 |
| `src/features/room/ParticipantTile.tsx` | Participant avatar/video tile | changed | +22/-3 |
| `src/features/room/RoomPage.tsx` | Chooses mock or live room view | changed | +5/-0 |
| `src/features/room/VideoViews.tsx` | Room speaker/gallery/filmstrip layouts | changed | +2/-3 |
| `src/features/rooms/CreateRoomDialog.tsx` | Room creation dialog | changed | +26/-7 |
| `src/features/rooms/RoomsPage.tsx` | Room list and session folders | changed | +4/-1 |
| `src/features/schedule/SchedulePage.tsx` | Schedule listing, create/edit/cancel dialogs | changed | +71/-10 |
| `src/features/settings/SettingsPage.tsx` | Profile, focus privacy, appearance, and account settings | changed | +60/-40 |
| `src/features/settings/prefs.ts` | Local focus/music preferences | changed | +2/-4 |
| `src/main.tsx` | Frontend entry point | changed | +3/-0 |
| `src/shared/context/command.tsx` | Global command palette context | changed | +3/-4 |
| `src/shared/context/profile.tsx` | Profile loading and updates | changed | +12/-2 |
| `src/shared/hooks/usePersistedState.ts` | Browser-persisted React state hook | changed | +27/-2 |
| `src/shared/ui/Avatar.tsx` | Avatar display component | changed | +5/-2 |
| `src/shared/ui/Dialog.tsx` | Accessible dialog primitive | changed | +3/-2 |
| `vite.config.ts` | Vite aliases, plugins, and development proxy config | changed | +9/-0 |

Untracked additions (line counts are approximate current text lines; binaries are reported by size):

| Path | What it does | Status | Approx. lines |
|---|---|---:|---:|
| `.env.example` | Frontend environment-variable template | added | ~20 |
| `.prettierrc` | Prettier formatting settings | added | ~11 |
| `CrowdCount-main (1).zip` | Uninspected archive; purpose/content not established by this audit | added | 25.8 KB binary |
| `RUNNING_AND_CONTRIBUTING.md` | Local run, testing, and contribution instructions | added | ~272 |
| `bun.lock` | Bun dependency lockfile | added | ~999 |
| `contract/package.json` | Shared contract workspace manifest | added | ~16 |
| `contract/src/index.ts` | Shared API schemas/types | added | ~298 |
| `contract/tsconfig.json` | TypeScript config for contract package | added | ~19 |
| `docker-compose.yml` | Local service orchestration | added | ~37 |
| `docker/init-db.sql` | Local database initialization | added | ~27 |
| `docs/BACKEND.md` | Backend architecture and operation guide | added | ~82 |
| `eslint.config.js` | Root ESLint configuration | added | ~21 |
| `public/models/efficientdet_lite0_uint8.tflite` | On-device object/phone detection model | added | 4.56 MB binary |
| `public/models/face_landmarker.task` | On-device face-landmark model | added | 3.76 MB binary |
| `scripts/start-real.ps1` | Windows launcher for frontend/backend real mode | added | ~236 |
| `server/.env.example` | Backend environment-variable template | added | ~22 |
| `server/eslint.config.js` | Backend ESLint configuration | added | ~38 |
| `server/package.json` | Backend scripts and dependencies | added | ~28 |
| `server/scripts/migrate.ts` | Backend database migration runner | added | ~106 |
| `server/src/app.ts` | Hono app assembly and API route mounting | added | ~51 |
| `server/src/cache/valkey.ts` | Valkey-backed rate-limit/cache support | added | ~33 |
| `server/src/config/env.ts` | Validated backend environment config | added | ~59 |
| `server/src/db/sql.ts` | Database connection and SQL helper | added | ~33 |
| `server/src/features/auth/repo.ts` | Auth/profile persistence operations | added | ~46 |
| `server/src/features/auth/routes.ts` | Backend auth routes | added | ~78 |
| `server/src/features/auth/schemas.ts` | Auth request validation schemas | added | ~8 |
| `server/src/features/auth/service.ts` | Auth business logic | added | ~259 |
| `server/src/features/focus/repo.ts` | Focus persistence operations | added | ~249 |
| `server/src/features/focus/routes.ts` | Focus API routes | added | ~71 |
| `server/src/features/focus/service.ts` | Focus business logic | added | ~174 |
| `server/src/features/friends/repo.ts` | Friend persistence operations | added | ~150 |
| `server/src/features/friends/routes.ts` | Friend API routes | added | ~71 |
| `server/src/features/friends/service.ts` | Friend business logic | added | ~80 |
| `server/src/features/health/routes.ts` | Health/readiness endpoints | added | ~14 |
| `server/src/features/materials/repo.ts` | Material persistence operations | added | ~61 |
| `server/src/features/materials/routes.ts` | Material API routes | added | ~31 |
| `server/src/features/materials/service.ts` | Material business logic | added | ~56 |
| `server/src/features/profiles/routes.ts` | Profile/avatar API routes | added | ~59 |
| `server/src/features/rooms/repo.ts` | Room, chat, board, and playback persistence | added | ~325 |
| `server/src/features/rooms/routes.ts` | Room, LiveKit token, chat, board, and playback routes | added | ~231 |
| `server/src/features/rooms/service.ts` | Room and live-feature business logic | added | ~251 |
| `server/src/features/schedule/repo.ts` | Schedule persistence operations | added | ~105 |
| `server/src/features/schedule/routes.ts` | Schedule API routes | added | ~58 |
| `server/src/features/schedule/service.ts` | Schedule business logic | added | ~77 |
| `server/src/features/youtube/routes.ts` | YouTube search/status API routes | added | ~81 |
| `server/src/index.ts` | Backend server entry point | added | ~37 |
| `server/src/lib/errors.ts` | Backend typed error helpers | added | ~48 |
| `server/src/lib/ids.ts` | ID helpers | added | ~13 |
| `server/src/lib/logger.ts` | Structured backend logger | added | ~45 |
| `server/src/lib/safeUrl.ts` | Backend URL validation helper | added | ~22 |
| `server/src/middleware/auth.ts` | Request authentication middleware | added | ~44 |
| `server/src/middleware/bodyLimit.ts` | Request body size limit | added | ~13 |
| `server/src/middleware/clientIp.ts` | Client IP extraction | added | ~25 |
| `server/src/middleware/cors.ts` | CORS policy | added | ~13 |
| `server/src/middleware/errorHandler.ts` | API error response handling | added | ~37 |
| `server/src/middleware/limits.ts` | Rate-limit policies | added | ~36 |
| `server/src/middleware/logger.ts` | Request logging middleware | added | ~15 |
| `server/src/middleware/rateLimit.ts` | Rate-limit middleware | added | ~123 |
| `server/src/middleware/requestId.ts` | Request ID middleware | added | ~16 |
| `server/src/middleware/secureHeaders.ts` | Security response headers | added | ~4 |
| `server/src/middleware/supabaseAuth.ts` | Supabase token validation middleware | added | ~43 |
| `server/tests/auth.test.ts` | Backend auth tests | added | ~96 |
| `server/tests/friends_focus.test.ts` | Backend friends/focus tests | added | ~122 |
| `server/tests/health.test.ts` | Health endpoint tests | added | ~40 |
| `server/tests/migrate_checksum.test.ts` | Migration checksum tests | added | ~38 |
| `server/tests/ratelimit.test.ts` | Rate-limit tests | added | ~42 |
| `server/tests/rooms.test.ts` | Backend room tests | added | ~132 |
| `server/tests/setup.ts` | Backend test setup | added | ~141 |
| `server/tests/supabaseAuth.ts` | Supabase auth test helper | added | ~176 |
| `server/tsconfig.json` | Backend TypeScript config | added | ~21 |
| `src/config/env.ts` | Typed frontend environment and mode switch | added | ~27 |
| `src/data/http/client.ts` | HTTP API client and access-token helper | added | ~96 |
| `src/data/http/repos.ts` | Alternative HTTP-backed repository implementation | added | ~232 |
| `src/data/supabase/client.ts` | Supabase client singleton | added | ~25 |
| `src/data/supabase/errors.ts` | Supabase/API error conversion | added | ~30 |
| `src/data/supabase/repos.ts` | Active Supabase repository implementation | added | ~580 |
| `src/data/supabase/request.ts` | Authenticated custom-API request helper | added | ~46 |
| `src/data/supabase/schedule.ts` | Custom API schedule client | added | ~53 |
| `src/features/auth/AuthPages.tsx` | Sign-in/up/reset-password screens | added | ~306 |
| `src/features/focus/__tests__/LinkViewer.test.ts` | Link viewer safety/embedding tests | added | ~62 |
| `src/features/focus/engine/__tests__/visionSignals.test.ts` | Vision signal tests | added | ~44 |
| `src/features/focus/engine/mediapipeEngine.ts` | On-device MediaPipe focus engine | added | ~141 |
| `src/features/focus/engine/visionSignals.ts` | Converts vision detections to focus signals | added | ~30 |
| `src/features/room/LiveAudioTracks.tsx` | Attaches LiveKit audio tracks | added | ~26 |
| `src/features/room/LiveChatPanel.tsx` | Live room chat UI | added | ~69 |
| `src/features/room/LiveMusicPlayer.tsx` | Live room synchronized YouTube music UI | added | ~227 |
| `src/features/room/LiveRoomPage.tsx` | LiveKit room UI and live-room feature orchestration | added | ~413 |
| `src/features/room/LiveWhiteboard.tsx` | Live synchronized whiteboard UI | added | ~266 |
| `src/features/room/YouTubeSearch.tsx` | YouTube search UI | added | ~76 |
| `src/features/room/__tests__/exportWhiteboard.test.ts` | Whiteboard export tests | added | ~20 |
| `src/features/room/__tests__/liveApi.test.ts` | Live API tests | added | ~46 |
| `src/features/room/__tests__/liveRoomSync.test.ts` | Live room synchronization tests | added | ~15 |
| `src/features/room/exportWhiteboard.ts` | Whiteboard export helper | added | ~22 |
| `src/features/room/liveApi.ts` | Live room token/chat/board/playback API client | added | ~158 |
| `src/features/room/liveRoomSync.ts` | Encodes/decodes live room synchronization packets | added | ~24 |
| `src/features/room/youtubeApi.ts` | YouTube status/search API client | added | ~29 |
| `src/shared/context/auth.tsx` | Auth state and Supabase auth operations | added | ~103 |
| `src/shared/lib/__tests__/safeUrl.test.ts` | Safe URL tests | added | ~98 |
| `src/shared/lib/apiError.ts` | Shared API error type | added | ~23 |
| `src/shared/lib/safeUrl.ts` | Frontend safe URL and YouTube ID validation | added | ~41 |
| `src/vite-env.d.ts` | Vite environment type declarations | added | ~13 |
| `v2_sql/01_extensions.sql` | Enables required database extensions | added | ~7 |
| `v2_sql/02_profiles.sql` | Profile schema and policies | added | ~68 |
| `v2_sql/03_rooms.sql` | Room schema, functions, and policies | added | ~252 |
| `v2_sql/04_friends.sql` | Friend schema, functions, and policies | added | ~211 |
| `v2_sql/05_focus.sql` | Focus schema, functions, and policies | added | ~194 |
| `v2_sql/06_materials.sql` | Study material schema and policies | added | ~29 |
| `v2_sql/07_live_chat.sql` | Live chat schema | added | ~27 |
| `v2_sql/08_live_whiteboard.sql` | Whiteboard schema | added | ~38 |
| `v2_sql/09_live_playback.sql` | Synchronized playback schema | added | ~30 |
| `v2_sql/10_schedule.sql` | Schedule schema and functions | added | ~40 |
| `v2_sql/11_avatar_storage.sql` | Avatar storage setup | added | ~36 |
| `v2_sql/12_function_permissions.sql` | Database function grants | added | ~34 |
| `v2_sql/13_material_storage.sql` | Study-material storage setup | added | ~81 |
| `v2_sql/14_whiteboard_custom_colors.sql` | Whiteboard color schema extension | added | ~19 |

## Behavior changes/deletions

- **Repository selection:** Removed `import { mockRepos } from './mock'` / `export const repos: Repos = mockRepos` from `src/data/index.ts`. Replaced by a `USE_MOCK` branch that dynamically imports mock repositories by default, or `supabaseRepos` when `VITE_USE_MOCK=false`; it does not silently fall back.
- **Auth and route access:** The former route tree put the app, `/room/:code`, and focus-session route directly in the shell with no auth guard. Real mode now gates the app and room/focus routes behind `RequireAuth`; `/j/:code` remains accessible before sign-in. Mock auth initializes signed-in, so the demo path is still usable.
- **Mock behavior is not literally untouched:** The switch still selects `src/data/mock`, and `RoomPage` still dispatches to `MockRoomPage` for `repos.kind === 'mock'`; however, mock implementations changed. Removed `lastPlan: () => delay({ ...LAST_PLAN })`; a mutable in-memory saved plan now backs `lastPlan`/`savePlan`. Mock material listing now filters by room and add supports room scope/PDF files instead of always creating personal URL-only material. Mock schedule methods gained update behavior.
- **Focus classification policy changed:** Removed the earlier thresholds `noFaceSec: 3`, `eyesClosedSec: 4`, `lookAwaySec: 5`, and `phoneSec: 2`; current values are 5 sec, 10 minutes, 30 sec, and 3 sec respectively. Also changed `let state: QualityState = 'focused'` to `noFace ? 'idle' : 'focused'`, and phone posture now uses `Math.abs(pitchDeg)`. New engine selection uses MediaPipe in live mode and the mock engine in mock mode. `docs/FOCUS_LOCK.md` itself says the thresholds are not validated on real students.
- **Focus tracking state/error semantics changed:** Previously `useFocusSession` always created the mock engine and called `start(stream)` without reporting startup errors. It now passes a mock/live flag, tracks `off/ready/error`, and records whether tracking actually ran in the completion callback. Rest start/end now update a ref as well as state to keep timer behavior synchronized.
- **Camera lifecycle changed:** The former hook separately set `idle/requesting/granted/denied/unavailable` state and cleared stream state on effect cleanup. It now associates results with an attempt number, derives status from the current attempt, and still stops late/opened tracks. The permission messages and retry/result handling were revised.
- **Join semantics changed by mode:** Removed the unconditional “No account needed” join copy and direct navigation-only join button. Mock still joins without an account; real mode checks device permissions, requires a profile, submits the room join, and displays errors before navigating.
- **Home room ordering/content changed:** Removed `list.filter(r => r.lastSessionAt).sort(...).slice(0, 3)` and the “sessions · last …” display; current UI takes the first three repository results and displays member counts/“no sessions yet”. This can change which rooms appear and their order.
- **Schedule behavior was revised, not removed:** The prior simple schedule-create form was replaced with a room-aware create/edit/cancel flow in live mode, including future-time, room, topic, and duration validation. Mock mode retains create and uses its mock repository. Copy reminder/join actions remain.
- **Settings removed one inert feature:** Removed `AiKeyConfig`, `EMPTY_AI`, `useAiKey`, and the “Your own AI helper” provider/model/API-key form. No current feature consumes that key and no replacement was found. Profile edit/avatar upload and focus/appearance settings remain, with updated validation/error handling. Any previously saved `ai.byok.v1` browser storage is not explicitly cleared by this diff.
- **Materials actions were refactored, not dropped:** The `useInFocus` helper and old row button were replaced by `handleUseInFocus`/updated UI; the path still saves draft links and navigates to focus. Room scoping, uploads, and safer URL handling were added.
- **URL/music behavior changed:** YouTube link parsing now validates URLs/IDs, rejects same-origin URLs, validates playlist IDs, and the iframe has a sandbox. This replaces the less-validated host/path parsing, not the player itself.
- **Other UI/data edits:** Friend search now hides stale hits while the query is under two characters; room creation/listing and participant/video components gained live-mode paths; dialog, avatar, command, profile, and resource-hook internals changed. In `useResource`, direct effect invocation was replaced by a deferred `Promise.resolve().then(run)` and the fetcher ref is updated in an effect.
- **Dependency and lockfile behavior:** Removed the npm lockfile and added Bun lockfile/workspaces. Added runtime dependencies `@mediapipe/tasks-vision`, `@studyroom/contract`, `@supabase/supabase-js`, `livekit-client`, and `zod`; added ESLint, Testing Library, Playwright, jsdom, and Prettier tooling. TypeScript changed from `^7.0.2` to pinned `6.0.3`.

## Risks

- **Mock/real switch verification:** The current switch is `import.meta.env.VITE_USE_MOCK !== 'false'`. In mock mode it uses mock repositories, mock room page, and mock focus engine; the visible “Prototype data” notice is conditioned on `repos.kind === 'mock'`. The core selection path remains, but the three mock repository files and `MockAttentionEngine` were edited, so the mock paths are not unchanged.
- **What real mode actually calls:** `src/data/index.ts` imports `src/data/supabase/repos.ts`, not `src/data/http/repos.ts`. Auth calls Supabase Auth (`getSession`, `signInWithPassword`, `signUp`, password reset/update, sign-out). Normal profile/room/friend/material/focus/stats data uses Supabase table/storage operations and RPCs: tables include `profiles`, `materials`, `focus_plans`, `focus_sessions`, and `focus_segments`; RPCs include `search_people`, `list_my_rooms`, `preview_room`, `create_room`, `join_room`, friend list/request mutations, `rollup_daily_focus`, and `weekly_stats`. Materials and avatars use Supabase Storage. Schedule uses the custom API (`GET/POST /api/v1/schedule`, `PUT/DELETE /api/v1/schedule/:id`); avatar upload URL uses `/api/v1/profiles/avatar/upload-url`; YouTube uses `/api/v1/youtube/status` and `/api/v1/youtube/search`. The live room client calls `/api/v1/rooms/:id/token`, `/chat`, `/board`, `/board/strokes`, `/board/undo`, and `/playback`, then connects via LiveKit.
- **Dormant/duplicated repository code:** `src/data/http/repos.ts` exports `httpRepos` and implements overlapping profile/room/friend/material/focus/stats calls via a second HTTP client, but the active switch does not import it and no other usage was found. It includes empty arrays and `unavailable()` stubs. `IS_PROD` is also exported but no use was found. This creates two competing “live” implementations and makes it easy to assume the HTTP backend is used for data when it is not.
- **Incomplete live repository methods:** In the selected Supabase repository, the `LiveRepo` methods for participants, doubts, chat, and ranks still return `unavailable(...)`; the live room UI separately implements some features through custom API/LiveKit. `src/data/http/repos.ts` also has unimplemented avatar, live, and schedule methods and empty `listSessions`/`listArtifacts`/schedule results. Verify each visible real-mode control against its actual implementation.
- **Backend test environment is unverified:** All six backend test files failed before assertions because Postgres refused connections. Therefore the added backend/server/database behavior is not validated by those tests in this environment.
- **Large files/assets:** New text files over 400 lines include `src/data/supabase/repos.ts` (~580), `src/features/room/LiveRoomPage.tsx` (~413), and `bun.lock` (~999). The two on-device model assets total about 8.3 MB. The production build emitted a 584.17 kB `RoomPage` chunk and warned that chunks exceed 500 kB.
- **Potentially accidental file:** `CrowdCount-main (1).zip` is an unexplained 25.8 KB untracked archive. Its contents were not inspected; confirm whether it belongs in the repository.
- **Code hygiene scan:** No `TODO`/`FIXME`, `@ts-ignore`, `console.log`, explicit `any`, or credential-shaped hardcoded secret was found in the inspected source/server/contract/scripts. Two `eslint-disable`/`eslint-disable-next-line` directives exist in `src/shared/context/command.tsx` and `src/data/hooks.ts`. The only password-like literals found were test fixture passwords. URLs found include expected localhost defaults, YouTube/Google endpoints, and placeholder Supabase URLs in env examples; no live credentials were identified.
- **Other review notes:** The `safeUrl` modules have separate frontend/backend implementations, and the Supabase/HTTP repository implementations duplicate domain mapping/call concepts. These may be intentional layering but should be consolidated or documented. No independent claim was made that a real Supabase, Postgres, storage, YouTube, or LiveKit deployment works.

## Check results

| Command | Result | Error count |
|---|---|---:|
| `bun run typecheck` | PASS (`tsc --noEmit`, exit 0) | 0 |
| `bun run lint` | PASS (`eslint src/`, exit 0) | 0 |
| `bun run build` | PASS (TypeScript and Vite build, exit 0); Vite warned about chunks over 500 kB | 0 errors |
| `bun run test` | PASS: 7 files, 60 tests | 0 |
| `bun run --cwd server test` | FAIL: 0 pass, 6 fail across 6 files | 6 test failures |

Trimmed failing backend output (same connection error in each test file):

```text
PostgresError: Failed to connect
 code: "ERR_POSTGRES_CONNECTION_REFUSED"

0 pass
6 fail
Ran 6 tests across 6 files.
```

`git diff --check` passed with no whitespace errors. No server typecheck/lint, real-mode integration test, or external-service test was run.

## Recommended fix order

1. Start/provision the expected Postgres test database and rerun `bun run --cwd server test`; then run backend typecheck and lint.
2. Decide whether real data should use direct Supabase repositories or the custom HTTP repositories. Wire one implementation consistently and remove/document the dormant duplicate. Validate live controls against their selected backend methods.
3. Run an integration/smoke test with migrations and configured Supabase, API, storage, YouTube, and LiveKit services; explicitly test mock mode and `VITE_USE_MOCK=false`.
4. Confirm the focus-classification thresholds/policy against product requirements and validate the stated on-device/privacy behavior before treating estimates as production-validated.
5. Confirm whether `CrowdCount-main (1).zip` is intended; document model assets and expected distribution. Consider splitting the 584 kB room chunk.
6. Keep one package manager/lockfile as the repository standard and document the intentional removal of npm lockfile if Bun is now required.
