-- Fix: the Requests screen showed the wrong person to the person RECEIVING a request.
-- Example: Rahul sends a request to Srija. Srija opened Requests and saw "Srija" (herself).
--
-- Cause: list_friend_requests() picked "the person who is not the requester", which is always the
-- receiver. That is right for the sender and wrong for the receiver. It must pick "the other person
-- relative to whoever is looking" (auth.uid()).
--
-- Do not edit 04_friends.sql: the migration runner refuses files that changed after being applied.
-- Depends-on: 04_friends, 12_function_permissions

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
    ON p.user_id = CASE WHEN f.user_a = auth.uid() THEN f.user_b ELSE f.user_a END
  WHERE f.status = 'pending'
    AND (f.user_a = auth.uid() OR f.user_b = auth.uid())
$$;

-- Same permissions as 12_function_permissions.sql, repeated so this file is safe to run on its own.
REVOKE ALL ON FUNCTION list_friend_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION list_friend_requests() TO authenticated;
