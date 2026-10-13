-- Feature: persisted room chat
-- Depends-on: 03_rooms

CREATE TABLE IF NOT EXISTS room_chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_chat_messages_recent
  ON room_chat_messages (room_id, created_at DESC, id DESC);

ALTER TABLE room_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_chat_member_read ON room_chat_messages;
CREATE POLICY room_chat_member_read ON room_chat_messages
  FOR SELECT TO authenticated
  USING (is_room_member(room_id));
DROP POLICY IF EXISTS room_chat_member_insert ON room_chat_messages;
CREATE POLICY room_chat_member_insert ON room_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_room_member(room_id));

GRANT SELECT, INSERT ON room_chat_messages TO authenticated;
GRANT ALL ON room_chat_messages TO service_role;
