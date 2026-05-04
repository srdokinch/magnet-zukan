INSERT INTO storage.buckets (id, name, public)
VALUES ('magnet-photos', 'magnet-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "magnet_photos_public_read" ON storage.objects;
CREATE POLICY "magnet_photos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'magnet-photos');

DROP POLICY IF EXISTS "magnet_photos_insert_own" ON storage.objects;
CREATE POLICY "magnet_photos_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'magnet-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "magnet_photos_update_own" ON storage.objects;
CREATE POLICY "magnet_photos_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'magnet-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'magnet-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "magnet_photos_delete_own" ON storage.objects;
CREATE POLICY "magnet_photos_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'magnet-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
