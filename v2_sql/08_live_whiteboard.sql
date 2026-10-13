-- Feature: persisted live-room whiteboard strokes
-- Depends-on: 03_rooms

CREATE TABLE IF NOT EXISTS room_whiteboard_strokes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  color       text NOT NULL CHECK (color IN ('#202124', '#d93025', '#1a73e8', '#188038', '#f9ab00')),
  width       smallint NOT NULL CHECK (width BETWEEN 2 AND 12),
  points      jsonb NOT NULL CHECK (
    CASE
      WHEN jsonb_typeof(points) = 'array' THEN jsonb_array_length(points) BETWEEN 2 AND 1000
      ELSE false
    END
  ),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_whiteboard_strokes_recent
  ON room_whiteboard_strokes (room_id, created_at, id);

ALTER TABLE room_whiteboard_strokes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_whiteboard_member_read ON room_whiteboard_strokes;
CREATE POLICY room_whiteboard_member_read ON room_whiteboard_strokes
  FOR SELECT TO authenticated
  USING (is_room_member(room_id));
DROP POLICY IF EXISTS room_whiteboard_member_insert ON room_whiteboard_strokes;
CREATE POLICY room_whiteboard_member_insert ON room_whiteboard_strokes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_room_member(room_id));
DROP POLICY IF EXISTS room_whiteboard_member_delete ON room_whiteboard_strokes;
CREATE POLICY room_whiteboard_member_delete ON room_whiteboard_strokes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND is_room_member(room_id));

GRANT SELECT, INSERT, DELETE ON room_whiteboard_strokes TO authenticated;
GRANT ALL ON room_whiteboard_strokes TO service_role;
