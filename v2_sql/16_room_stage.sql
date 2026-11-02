-- Feature: shared room Study stage
-- Depends-on: 03_rooms

CREATE TABLE IF NOT EXISTS room_stage_state (
  room_id       uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  url           text NOT NULL CHECK (length(url) BETWEEN 1 AND 2048),
  title         text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  kind          text NOT NULL CHECK (length(kind) BETWEEN 1 AND 40),
  controller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE room_stage_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_stage_member_read ON room_stage_state;
CREATE POLICY room_stage_member_read ON room_stage_state
  FOR SELECT TO authenticated
  USING (is_room_member(room_id));
DROP POLICY IF EXISTS room_stage_member_insert ON room_stage_state;
CREATE POLICY room_stage_member_insert ON room_stage_state
  FOR INSERT TO authenticated
  WITH CHECK (controller_id = auth.uid() AND is_room_member(room_id));
DROP POLICY IF EXISTS room_stage_member_update ON room_stage_state;
CREATE POLICY room_stage_member_update ON room_stage_state
  FOR UPDATE TO authenticated
  USING (is_room_member(room_id))
  WITH CHECK (controller_id = auth.uid() AND is_room_member(room_id));

GRANT SELECT, INSERT, UPDATE ON room_stage_state TO authenticated;
GRANT ALL ON room_stage_state TO service_role;
