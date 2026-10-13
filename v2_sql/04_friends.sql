-- Feature: friendships and friend requests
-- Depends-on: 02_profiles

CREATE TABLE IF NOT EXISTS friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_ordered CHECK (user_a < user_b),
  CONSTRAINT friendships_unique UNIQUE (user_a, user_b)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships (user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships (user_b);

CREATE OR REPLACE FUNCTION search_people(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR p_query IS NULL OR length(p_query) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: Search query must be 1 to 80 characters';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', matches.id,
      'name', matches.name,
      'handle', matches.handle,
      'avatarUrl', matches.avatar_url,
      'relation', matches.relation,
      'mutualFriends', 0
    ) ORDER BY matches.handle)
    FROM (
      SELECT
        p.user_id AS id,
        p.name,
        p.handle,
        p.avatar_url,
        CASE
          WHEN p.user_id = uid THEN 'self'
          WHEN f.status = 'accepted' THEN 'friend'
          WHEN f.status = 'pending' AND f.requested_by = uid THEN 'outgoing'
          WHEN f.status = 'pending' THEN 'incoming'
          ELSE 'none'
        END AS relation
      FROM profiles p
      LEFT JOIN friendships f
        ON f.user_a = least(uid, p.user_id)
        AND f.user_b = greatest(uid, p.user_id)
        AND f.status IN ('pending', 'accepted', 'blocked')
      WHERE (p.name ILIKE '%' || p_query || '%' OR p.handle::text ILIKE '%' || p_query || '%')
        AND coalesce(f.status, '') <> 'blocked'
      ORDER BY p.handle
      LIMIT 8
    ) AS matches
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION list_friends()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.user_id,
    'name', p.name,
    'handle', p.handle,
    'avatarUrl', p.avatar_url,
    'presence', 'offline'
  ) ORDER BY p.name), '[]'::jsonb)
  FROM friendships f
  JOIN profiles p
    ON p.user_id = CASE WHEN f.user_a = auth.uid() THEN f.user_b ELSE f.user_a END
  WHERE f.status = 'accepted'
    AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
$$;

CREATE OR REPLACE FUNCTION list_friend_requests()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'direction', CASE WHEN f.requested_by = auth.uid() THEN 'outgoing' ELSE 'incoming' END,
    'user', jsonb_build_object(
      'id', p.user_id, 'name', p.name, 'handle', p.handle, 'avatarUrl', p.avatar_url
    ),
    'at', f.created_at
  ) ORDER BY f.created_at DESC), '[]'::jsonb)
  FROM friendships f
  JOIN profiles p
    ON p.user_id = CASE WHEN f.requested_by = f.user_a THEN f.user_b ELSE f.user_a END
  WHERE f.status = 'pending'
    AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
$$;

CREATE OR REPLACE FUNCTION send_friend_request(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  user_low uuid;
  user_high uuid;
BEGIN
  IF uid IS NULL OR uid = p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Invalid request';
  END IF;
  user_low := least(uid, p_user_id);
  user_high := greatest(uid, p_user_id);

  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE user_a = user_low AND user_b = user_high AND status = 'blocked'
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Blocked';
  END IF;
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE user_a = user_low AND user_b = user_high AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'CONFLICT: Already friends';
  END IF;

  INSERT INTO friendships (user_a, user_b, status, requested_by)
  VALUES (user_low, user_high, 'pending', uid);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'CONFLICT: Request already pending';
END;
$$;

CREATE OR REPLACE FUNCTION respond_friend_request(p_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  f friendships%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  SELECT * INTO f FROM friendships WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR f.status <> 'pending' THEN
    RAISE EXCEPTION 'NOT_FOUND: Request not found';
  END IF;
  IF f.requested_by = uid THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot respond to your own request';
  END IF;
  IF f.user_a <> uid AND f.user_b <> uid THEN
    RAISE EXCEPTION 'FORBIDDEN: Forbidden';
  END IF;

  IF p_accept THEN
    UPDATE friendships SET status = 'accepted', updated_at = now() WHERE id = p_id;
  ELSE
    DELETE FROM friendships WHERE id = p_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_friend_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM friendships
  WHERE id = p_id AND requested_by = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Request not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION remove_friend(p_friend_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM friendships
  WHERE user_a = least(auth.uid(), p_friend_id)
    AND user_b = greatest(auth.uid(), p_friend_id)
    AND status = 'accepted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Friendship not found';
  END IF;
END;
$$;
