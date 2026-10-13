-- Feature: allow custom hex colors on shared whiteboard strokes
-- Depends-on: 08_live_whiteboard

DO $$
BEGIN
  IF to_regclass('public.room_whiteboard_strokes') IS NULL THEN
    RAISE EXCEPTION
      'Cannot apply 14_whiteboard_custom_colors.sql: run 08_live_whiteboard.sql first (and its prerequisite migrations).';
  END IF;
END
$$;

ALTER TABLE room_whiteboard_strokes
  DROP CONSTRAINT IF EXISTS room_whiteboard_strokes_color_check;

ALTER TABLE room_whiteboard_strokes
  ADD CONSTRAINT room_whiteboard_strokes_color_check
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
