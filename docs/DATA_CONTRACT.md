# Data contract (input for the Supabase SQL)

Principle: every repository method in `src/data/repositories.ts` is ONE query, view or RPC. No loops, no N+1.
Set-based writes only. Aggregates come from SQL, not from client code.

## Tables
| Table | Key columns | Notes |
|---|---|---|
| profiles | id (= auth uid), name, handle UNIQUE, avatar_path, created_at | avatar stored as a ~256px JPEG in Storage |
| user_prefs | user_id PK, camera_mode, share_focus, rest_budget_pct, whatsapp_reminders | AI key is NOT stored (browser only) |
| friendships | user_a, user_b (user_a < user_b), status (pending/accepted), requested_by, created_at | UNIQUE(user_a,user_b). View `v_friends(user_id, friend_id)` is a UNION of both directions |
| rooms | id, code UNIQUE, name, topic, mode (study/teach), owner_id, visibility, created_at | |
| room_members | room_id, user_id, role (owner/member), joined_at, last_seen_at | PK(room_id,user_id). Index (user_id) |
| sessions | id, room_id, title, started_at, ended_at | one row per live session = one folder |
| session_attendees | session_id, user_id, joined_at, left_at, quality_score | PK(session_id,user_id) |
| session_artifacts | id, session_id, kind (board/recap/doubts/material/transcript), title, storage_path, meta jsonb | files live in Storage |
| materials | id, owner_id, room_id NULL, kind, title, url, host, tags text[], size_kb, created_at | room_id NULL = personal library |
| doubts / doubt_votes | doubts(id, room_id, session_id, author_id, anonymous, body, tag, status, pinned, created_at); votes PK(doubt_id,user_id) | vote count by aggregate, never stored twice |
| scheduled_sessions | id, room_id, title, starts_at, duration_min, recurrence | + rsvps(session_id,user_id) |
| focus_sessions | id, user_id, title, started_at, planned_min, elapsed_sec, rest_budget_pct, tracked bool, camera_mode | |
| focus_links | session_id, position, kind (material/practice/ai), label, url | |
| focus_segments | session_id, seq, state, start_sec, end_sec | run-length encoded. ~10-40 rows per session, never per-second samples |
| daily_focus | user_id, day, focused_sec, resting_sec, phone_sec, lapse_sec, idle_sec | PK(user_id,day). Upserted once at session end from focus_segments (single INSERT ... ON CONFLICT) |

## Screen -> repository -> query
| Screen | Method | Query shape |
|---|---|---|
| Home stats, Stats | stats.weekly | `daily_focus` WHERE user_id AND day in last 7. 1 query |
| Home upcoming, Schedule | schedule.upcoming | scheduled_sessions JOIN rsvps count, ordered, limit |
| My rooms | rooms.listMine | view `v_my_rooms`: room_members JOIN rooms + lateral COUNT of members and sessions + MAX(started_at) |
| Room folder | rooms.listSessions | sessions + attendee count + avg quality via GROUP BY. 1 query |
| Session folder | rooms.listArtifacts | session_artifacts WHERE session_id |
| Friends list | friends.list | `v_friends` JOIN profiles LEFT JOIN presence (from realtime, not DB) |
| Requests | friends.requests | friendships WHERE status='pending' AND (user_a=me OR user_b=me) |
| Find people | friends.search | profiles by pg_trgm on name/handle, LEFT JOIN friendships for `relation`, LIMIT 8. 1 query |
| Library | materials.list | materials WHERE owner_id=me OR room_id IN (my rooms) |
| Focus recap | focus.get | focus_sessions + focus_segments ordered by seq (2 selects, or 1 with json_agg) |
| Recent focus | focus.recent | focus_sessions JOIN `v_focus_summary` (SUM(end-start) FILTER (WHERE state=...) per session) |
| Doubts | live.doubts | doubts LEFT JOIN doubt_votes GROUP BY, ordered by votes |

## Realtime (not tables)
- Presence channel `room:{code}`: participants, mic/cam, hand order, speaking, optional focus colour (only when user opted in).
- Broadcast: chat, doubt events, board ops, layout. Chat and doubts are also persisted by an insert.
- Room timer: one row `room_timers(room_id, ends_at, running)` owned by the server. Clients only read it.

## Security (RLS)
- Default deny on every table. Policies by membership: `room_id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())`.
- focus_sessions, focus_links, focus_segments, daily_focus: owner only. Others never read another person's segments.
- The server uses the service key. The browser never gets it.
- Passwordless/OAuth auth. Guests join with a signed, short-lived room ticket (see invite-link design in the product spec).

## Efficiency notes
- Indexes: room_members(user_id), sessions(room_id, started_at DESC), materials(owner_id, created_at DESC), friendships(user_a), friendships(user_b), daily_focus(user_id, day).
- Pagination by keyset on created_at, never OFFSET on feeds.
- Segment writes: one batch INSERT of all segments at session end (plus a checkpoint every 5 min for crash safety).
