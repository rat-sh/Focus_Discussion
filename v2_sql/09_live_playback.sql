-- Feature: room-level shared YouTube playback
-- Depends-on: 03_rooms

CREATE TABLE IF NOT EXISTS room_playback_state (
  room_id           uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  video_id          text NOT NULL CHECK (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  is_playing        boolean NOT NULL DEFAULT false,
  position_seconds  integer NOT NULL DEFAULT 0 CHECK (position_seconds BETWEEN 0 AND 86400),
  controller_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_playback_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_playback_member_read ON room_playback_state;
CREATE POLICY room_playback_member_read ON room_playback_state
  FOR SELECT TO authenticated
  USING (is_room_member(room_id));
DROP POLICY IF EXISTS room_playback_member_insert ON room_playback_state;
CREATE POLICY room_playback_member_insert ON room_playback_state
  FOR INSERT TO authenticated
  WITH CHECK (controller_id = auth.uid() AND is_room_member(room_id));
DROP POLICY IF EXISTS room_playback_member_update ON room_playback_state;
CREATE POLICY room_playback_member_update ON room_playback_state
  FOR UPDATE TO authenticated
  USING (is_room_member(room_id))
  WITH CHECK (controller_id = auth.uid() AND is_room_member(room_id));

GRANT SELECT, INSERT, UPDATE ON room_playback_state TO authenticated;
GRANT ALL ON room_playback_state TO service_role;
