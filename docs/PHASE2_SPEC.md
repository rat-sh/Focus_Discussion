# Phase 2: product specification and UX

Status: specification. Only the items in section 7 are implemented. Everything else is a proposal until built and tested.
Supersedes the colour and score parts of `FOCUS_LOCK.md` (those predate the "estimates, not verdicts" rule).

## 1. Information architecture and navigation
| Area | Route | Access | Backing entity (Phase 3) |
|---|---|---|---|
| Home | `/` | signed in | stats, schedule, recent rooms |
| My Rooms | `/rooms`, `/rooms/:room`, `/rooms/:room/:session` | members only | rooms, members, sessions, artifacts |
| Room (live) | `/room/:code` (reached via `/j/:code`) | membership or valid invite | presence, chat, doubts, board |
| Invite | `/j/:code` | public page, shows reason when closed/full | room invite |
| Focus | `/focus` (setup), `/focus/session` (active), `/recap/:id` | owner only | focus sessions + events |
| Friends | `/friends`, `/u/:handle`, `/add/:handle` | signed in (profile page public-minimal) | friendships, profiles |
| Library | `/materials` | personal + room-shared | materials |
| More | `/schedule`, `/stats`, `/settings` | signed in | schedules, daily rollup, prefs |
| Todos | in room workspace and personal list | per room role | Phase 5 (not in `studyroom-web` yet) |
Phone: bottom tabs Home, Rooms, Focus, Friends, More. Desktop: left rail. Ctrl/Cmd+K palette everywhere. The live room and the active focus session are full-screen with no shell.

## 2. Key journeys (failure paths included)
1. **Invite link:** WhatsApp link -> `/j/CODE` -> name (guest) or sign in -> room. Failure: full, expired, not found each explain why and offer Home. Direct `/room/CODE` for a closed room redirects to the join screen (implemented).
2. **Returning to work:** My Rooms -> room -> session -> its board, materials, doubts, recap. Reload and other devices show the same folders (needs Phase 4+).
3. **Friends:** share `/add/<handle>` -> profile -> Add friend -> other user accepts in Requests. Unknown handle shows "No such user" (implemented). Duplicates and self-requests are blocked server-side (Phase 5).
4. **Focus Lock:** links (min 1) -> time -> camera check or camera-off -> session -> break/resume -> finish -> recap and annotate. Refresh mid-session resumes (section 5.1).
5. **Teach:** create Teach room -> share link -> host hands stage to a member -> everyone sees the same board.
6. **Phone listener:** open link -> join muted, camera off -> read the board -> raise hand or post a doubt.

## 3. Responsive specs (tested widths: 320, 360, 390, 430, 768, 1440, and 844x390 landscape)
| Screen | Phone | Tablet | Desktop |
|---|---|---|---|
| Home | one column, stat grid 2x2 | two columns | two columns + stats row |
| My Rooms | drill-down list > room > session | list + detail | list + sessions + files |
| Live room | content full width, filmstrip, 5 controls, panels as bottom sheet | desktop layout | content >= 70%, 320 px panel, 20-tile gallery |
| Focus session | compact header, links as tabs, 72x96 camera tile | same | 96x128 tile, optional pop-out window |
| Friends / Library / Settings | stacked lists, 44 px rows | same | max width 1152 |
Targets: no horizontal scroll, text >= 12 px, phone tap targets >= 40 px (44 preferred), safe-area insets, `100dvh`, reduced motion respected. All verified by `scripts/ui-audit.py` (layout only: not contrast, not screen readers).

## 4. Design system
Tokens in `src/styles/index.css`; components in `src/shared/ui`; rules and the pre-merge checklist in `docs/UX_RULES.md`. One accent, flat surfaces, 6 px radius, icon + label for every state colour. A "Prototype data" notice shows while repositories are mock (`repos.kind`) and disappears when real repositories are wired.

## 5. Focus Lock rules (proposal, thresholds unvalidated)
### 5.1 Time model (recovery-safe)
- Server owns time. `started_at`, pauses, breaks and finish are **server-stamped events** in an append-only `session_events` log. Remaining time = planned active time minus active time computed from events.
- The client interval only paints the clock. On refresh or reconnect the client reloads the session and events and recomputes. A backgrounded tab cannot drift the record.
- If the planned end passes while the tab is closed, the session is marked `auto_ended` on next read (or by a scheduled job). It is never silently "completed with full quality".

### 5.2 Signals, then inference, then display
Observations (facts, with confidence): face present, eyes-closed score, head yaw/pitch, phone-like object, page visible, camera status. They are inputs, never conclusions.
| Cause | Yellow (gentle reminder) | Pink (needs your answer) | Red (sustained, rule-based) |
|---|---|---|---|
| Face not visible | after 3 s: "We can't see you" | after 20 s: "Taking a break?" | still unanswered 60 s after pink |
| Eyes closed | after 6 s: "Resting your eyes?" | after 30 s | only if pink is unanswered 60 s |
| Looking away | after 8 s | after 45 s | only if pink is unanswered 60 s |
| Possible phone (object + head down) | after 3 s: "Possible phone use" | n/a | yellow persisting 120 s |
| Page hidden | grey "Not monitored", reminder after 10 min | n/a | never red from this alone |
Pink is also a **declared break** (button, 5 min chunks). Ordinary reading or thinking is never auto-labelled rest. Offline-practice sessions relax the looking-down rule.
Hysteresis: a state must hold 5 s before it is shown; return to green needs 5 s of continuous positive signal; max one reminder per cause per 5 min. All values are user-adjustable ("gentle" mode) and stored in config, not code.
Every red shows its reason and a recovery action ("I'm here", "Taking a break"). The user's answer is recorded and does not erase the original classification.

### 5.3 Measurements (stored separately)
`wall_clock` end - start. `paused` sum of pauses. `active` = wall - paused. `declared_break`. `focused_est` = green time while monitored. `uncertain` = yellow + unanswered pink + red. `not_monitored` = grey (camera off, page hidden). Warnings counted by cause. Completion: `completed`, `ended_early`, `auto_ended`, `abandoned`.
**Estimated focus ratio** = `focused_est / (active - declared_break - not_monitored)`, shown as "Estimated focus 82% of 74 monitored minutes".
**Sleeping through 2 hours:** the clock can reach 2 h, but focused_est stops accruing after the first reminders, uncertain time is large, and the record reads "completed, estimated focus 4%". It is not labelled cheating or sleep. Camera-off sessions show active time only, with no quality claim.

### 5.4 Correction and audit trail
The student can annotate any interval ("I was listening with eyes closed") and mark a classification as wrong. Original events stay; the summary shows "as detected" and "as annotated". Edits are logged with time. Only the owner sees their timeline.

### 5.5 Privacy and limits
Camera needs explicit consent and a visible stop control. Processing is on-device. No raw video, frames or face embeddings are stored. Camera-off mode is a first-class option and says which features it disables. We never claim to lock the phone or monitor other apps; browsers cannot do that.

### 5.6 Detector validation (before any real user is scored)
Record a matrix: reading, writing, looking down at a book, blinking, yawning, drinking, phone use, napping, glasses, low light, desk and lap camera angles, small and large screens, dark skin tones, head coverings. Measure false reminders on focused students and misses on genuinely absent ones. **You set the acceptable rates.** CrowdCount is not used (it counts people only).

## 6. Open decisions for Phase 3
D2 Supabase Auth (recommended). D3 SFU for 20-person video. D4 schema-only dump of the live DB and permission to use a staging Supabase project. D5 (new) sign-in for guests: allow guest joins by invite, or require an account?

## 7. What Phase 2 changed in `studyroom-web` (commit after tag `phase1-baseline`)
Removed controls that did nothing and the messages that claimed success: screen share, board export/undo/redo/add page, "Give stage", folder "All files"/"Open", "Share recap", "Invite" (friends), "Ask me before people join", "Share my focus colour", "WhatsApp reminders", "Save and test", and the "Session saved" toast on Leave. Removed the duplicate Library side tab and the fake Screen tab.
Added: `/u/:handle` profile page and `/add/:handle` redirect, "No such user" state, join-screen gate for rooms that are not open, "Prototype data" notice, board "preview" banner, hedged Focus state wording, honest face-check row ("detection not connected").
Fixed: Settings fields empty on load, side-panel tabs hidden, Friends overflow at 320 px, friend "Join" always opening one fixed room, `?demo=1` bypass (now dev-only, or `VITE_ENABLE_DEMO=true`).
Verification: typecheck pass, 18 of 18 unit tests, production and demo builds pass, layout audit NO ISSUES on 15 routes x 7 viewports, 20 of 20 click-through checks pass (Chromium only, emulated devices).
Still mock: all data and persistence, auth, realtime, media, board, detector, todos, lobby, protected rooms, Media Hub. None of these is label-free: the notice and preview banners say so.
