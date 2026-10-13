-- Feature: private PDF storage and room-shared materials
-- Depends-on: 03_rooms, 06_materials

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_storage_path
  ON materials (storage_path)
  WHERE storage_path IS NOT NULL;

DROP POLICY IF EXISTS materials_own ON materials;
DROP POLICY IF EXISTS materials_read ON materials;
CREATE POLICY materials_read ON materials
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (room_id IS NOT NULL AND is_room_member(room_id))
  );

DROP POLICY IF EXISTS materials_insert ON materials;
CREATE POLICY materials_insert ON materials
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (room_id IS NULL OR is_room_member(room_id))
  );

DROP POLICY IF EXISTS materials_update ON materials;
CREATE POLICY materials_update ON materials
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (room_id IS NULL OR is_room_member(room_id))
  );

DROP POLICY IF EXISTS materials_delete ON materials;
CREATE POLICY materials_delete ON materials
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('study-materials', 'study-materials', false, 26214400, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS study_materials_read ON storage.objects;
CREATE POLICY study_materials_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'study-materials'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.materials AS m
        WHERE m.storage_path = name
          AND m.room_id IS NOT NULL
          AND public.is_room_member(m.room_id)
      )
    )
  );

DROP POLICY IF EXISTS study_materials_insert ON storage.objects;
CREATE POLICY study_materials_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'study-materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS study_materials_delete ON storage.objects;
CREATE POLICY study_materials_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'study-materials'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
