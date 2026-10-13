-- Feature: Supabase-authenticated user profiles
-- Depends-on: 01_extensions

CREATE TABLE IF NOT EXISTS profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT '',
  handle       citext NOT NULL UNIQUE,
  avatar_url   text,
  streak_days  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_name_length CHECK (length(name) BETWEEN 0 AND 60),
  CONSTRAINT profiles_handle_format CHECK (handle ~ '^[a-z0-9._]{3,24}$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm
  ON profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_handle_trgm
  ON profiles USING gin (handle gin_trgm_ops);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_handle text;
  generated_handle text;
BEGIN
  requested_handle := lower(new.raw_user_meta_data ->> 'handle');
  generated_handle := 'u' || left(replace(new.id::text, '-', ''), 12);

  IF requested_handle IS NULL
     OR requested_handle !~ '^[a-z0-9._]{3,24}$' THEN
    requested_handle := generated_handle;
  END IF;

  INSERT INTO profiles (user_id, name, handle)
  VALUES (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Student'), 60),
    requested_handle
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (name, handle, avatar_url, updated_at) ON profiles TO authenticated;
