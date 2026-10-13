-- Feature: scheduled room sessions
-- Depends-on: 03_rooms

CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (length(title) BETWEEN 2 AND 100),
  topic         text NOT NULL CHECK (length(topic) BETWEEN 1 AND 120),
  starts_at     timestamptz NOT NULL,
  duration_min  integer NOT NULL CHECK (duration_min BETWEEN 15 AND 240),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_room_start
  ON scheduled_sessions (room_id, starts_at);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scheduled_session_member_read ON scheduled_sessions;
CREATE POLICY scheduled_session_member_read ON scheduled_sessions
  FOR SELECT TO authenticated
  USING (is_room_member(room_id));
DROP POLICY IF EXISTS scheduled_session_member_insert ON scheduled_sessions;
CREATE POLICY scheduled_session_member_insert ON scheduled_sessions
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND is_room_member(room_id));
DROP POLICY IF EXISTS scheduled_session_owner_update ON scheduled_sessions;
CREATE POLICY scheduled_session_owner_update ON scheduled_sessions
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND is_room_member(room_id))
  WITH CHECK (owner_id = auth.uid() AND is_room_member(room_id));
DROP POLICY IF EXISTS scheduled_session_owner_delete ON scheduled_sessions;
CREATE POLICY scheduled_session_owner_delete ON scheduled_sessions
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND is_room_member(room_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_sessions TO authenticated;
GRANT ALL ON scheduled_sessions TO service_role;
