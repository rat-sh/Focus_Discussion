-- Feature: rooms, membership, and room RPCs
-- Depends-on: 02_profiles

CREATE TABLE IF NOT EXISTS rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  topic        text NOT NULL DEFAULT '',
  mode         text NOT NULL DEFAULT 'study' CHECK (mode IN ('study', 'teach')),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members  integer NOT NULL DEFAULT 25 CHECK (max_members BETWEEN 1 AND 100),
  closed       boolean NOT NULL DEFAULT false,
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_name_length CHECK (length(name) BETWEEN 1 AND 80),
  CONSTRAINT rooms_topic_length CHECK (length(topic) <= 200),
  CONSTRAINT rooms_code_length CHECK (length(code) BETWEEN 4 AND 16)
);

CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms (owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
CREATE INDEX IF NOT EXISTS idx_rooms_expires
  ON rooms (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS room_members (
  room_id    uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members (user_id);

CREATE OR REPLACE FUNCTION is_room_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members AS rm
    WHERE rm.room_id = p_room_id
      AND rm.user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION is_room_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_room_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  alphabet CONSTANT text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(
      alphabet,
      1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)),
      1
    );
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION room_dto(p_room_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'code', r.code,
    'name', r.name,
    'topic', r.topic,
    'mode', r.mode,
    'membership', rm.role,
    'owner_name', p.name,
    'member_count', (
      SELECT count(*)::integer FROM room_members m WHERE m.room_id = r.id
    ),
    'session_count', 0,
    'last_session_at', NULL
  )
  FROM rooms r
  JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = p_user_id
  JOIN profiles p ON p.user_id = r.owner_id
  WHERE r.id = p_room_id
$$;

CREATE OR REPLACE FUNCTION create_room(p_name text, p_topic text, p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  rid uuid;
  code text;
  attempts integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Sign in required';
  END IF;

  LOOP
    code := invite_code();
    BEGIN
      INSERT INTO rooms (code, name, topic, mode, owner_id)
      VALUES (code, p_name, coalesce(p_topic, ''), coalesce(p_mode, 'study'), uid)
      RETURNING id INTO rid;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts >= 8 THEN
        RAISE EXCEPTION 'CONFLICT: Could not allocate invite code';
      END IF;
    END;
  END LOOP;

  INSERT INTO room_members (room_id, user_id, role)
  VALUES (rid, uid, 'owner');
  RETURN room_dto(rid, uid);
END;
$$;

CREATE OR REPLACE FUNCTION list_my_rooms()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    jsonb_agg(room_dto(rm.room_id, auth.uid()) ORDER BY r.created_at DESC),
    '[]'::jsonb
  )
  FROM room_members rm
  JOIN rooms r ON r.id = rm.room_id
  WHERE rm.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION preview_room(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r rooms%ROWTYPE;
  member_count integer;
  host_name text;
  room_availability text := 'open';
BEGIN
  SELECT * INTO r FROM rooms WHERE upper(code) = upper(p_code) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'code', upper(p_code), 'name', '', 'hostName', '', 'mode', 'study',
      'insideCount', 0, 'availability', 'not-found'
    );
  END IF;

  SELECT count(*)::integer INTO member_count
  FROM room_members WHERE room_id = r.id;
  SELECT name INTO host_name FROM profiles WHERE user_id = r.owner_id;

  IF r.closed OR (r.expires_at IS NOT NULL AND r.expires_at < now()) THEN
    room_availability := 'expired';
  ELSIF member_count >= r.max_members THEN
    room_availability := 'full';
  END IF;

  RETURN jsonb_build_object(
    'code', r.code, 'name', r.name, 'hostName', coalesce(host_name, ''),
    'mode', r.mode, 'insideCount', member_count,
    'availability', room_availability
  );
END;
$$;

CREATE OR REPLACE FUNCTION join_room(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  r rooms%ROWTYPE;
  member_count integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Sign in required';
  END IF;

  SELECT * INTO r
  FROM rooms
  WHERE upper(code) = upper(p_code)
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Room not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM room_members WHERE room_id = r.id AND user_id = uid
  ) THEN
    RETURN room_dto(r.id, uid);
  END IF;
  IF r.closed OR (r.expires_at IS NOT NULL AND r.expires_at < now()) THEN
    RAISE EXCEPTION 'GONE: Room closed or expired';
  END IF;

  SELECT count(*)::integer INTO member_count
  FROM room_members WHERE room_id = r.id;
  IF member_count >= r.max_members THEN
    RAISE EXCEPTION 'CONFLICT: Room is full';
  END IF;

  INSERT INTO room_members (room_id, user_id, role)
  VALUES (r.id, uid, 'member');
  RETURN room_dto(r.id, uid);
END;
$$;

CREATE OR REPLACE FUNCTION delete_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: Sign in required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM rooms
    WHERE id = p_room_id
      AND owner_id = uid
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Owner only';
  END IF;

  DELETE FROM room_playback_state WHERE room_id = p_room_id;
  DELETE FROM room_whiteboard_strokes WHERE room_id = p_room_id;
  DELETE FROM room_chat_messages WHERE room_id = p_room_id;
  DELETE FROM room_members WHERE room_id = p_room_id;
  DELETE FROM rooms WHERE id = p_room_id;
END;
$$;

REVOKE ALL ON FUNCTION delete_room(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_room(uuid) TO authenticated;

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rooms_member_read ON rooms;
CREATE POLICY rooms_member_read ON rooms
  FOR SELECT TO authenticated
  USING (is_room_member(id));
DROP POLICY IF EXISTS members_read ON room_members;
CREATE POLICY members_read ON room_members
  FOR SELECT TO authenticated
  USING (is_room_member(room_id));

GRANT SELECT ON rooms, room_members TO authenticated;
