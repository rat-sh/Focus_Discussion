-- Feature: user-owned study materials
-- Depends-on: 02_profiles, 03_rooms

CREATE TABLE IF NOT EXISTS materials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id     uuid REFERENCES rooms(id) ON DELETE SET NULL,
  kind        text NOT NULL DEFAULT 'article'
              CHECK (kind IN ('pdf', 'video', 'article', 'practice', 'ai', 'notes')),
  title       text NOT NULL,
  url         text NOT NULL,
  host        text NOT NULL DEFAULT '',
  tags        text[] NOT NULL DEFAULT '{}',
  size_kb     integer CHECK (size_kb IS NULL OR size_kb >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_owner
  ON materials (owner_id, created_at DESC);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS materials_own ON materials;
CREATE POLICY materials_own ON materials
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON materials TO authenticated;
