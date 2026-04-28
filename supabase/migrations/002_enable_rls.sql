ALTER TABLE magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE magnet_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "magnets_select_own" ON magnets;
DROP POLICY IF EXISTS "magnets_insert_own" ON magnets;
DROP POLICY IF EXISTS "magnets_update_own" ON magnets;
DROP POLICY IF EXISTS "magnets_delete_own" ON magnets;

CREATE POLICY "magnets_select_own"
ON magnets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "magnets_insert_own"
ON magnets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "magnets_update_own"
ON magnets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "magnets_delete_own"
ON magnets
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "fridge_layouts_select_own" ON fridge_layouts;
DROP POLICY IF EXISTS "fridge_layouts_insert_own" ON fridge_layouts;
DROP POLICY IF EXISTS "fridge_layouts_update_own" ON fridge_layouts;
DROP POLICY IF EXISTS "fridge_layouts_delete_own" ON fridge_layouts;

CREATE POLICY "fridge_layouts_select_own"
ON fridge_layouts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "fridge_layouts_insert_own"
ON fridge_layouts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "fridge_layouts_update_own"
ON fridge_layouts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "fridge_layouts_delete_own"
ON fridge_layouts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "magnet_positions_select_own" ON magnet_positions;
DROP POLICY IF EXISTS "magnet_positions_insert_own" ON magnet_positions;
DROP POLICY IF EXISTS "magnet_positions_update_own" ON magnet_positions;
DROP POLICY IF EXISTS "magnet_positions_delete_own" ON magnet_positions;

CREATE POLICY "magnet_positions_select_own"
ON magnet_positions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "magnet_positions_insert_own"
ON magnet_positions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "magnet_positions_update_own"
ON magnet_positions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "magnet_positions_delete_own"
ON magnet_positions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
