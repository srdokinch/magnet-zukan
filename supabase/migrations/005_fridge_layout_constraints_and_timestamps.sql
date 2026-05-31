ALTER TABLE magnet_positions
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE magnet_positions
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_magnets_updated_at ON magnets;
CREATE TRIGGER set_magnets_updated_at
BEFORE UPDATE ON magnets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_fridge_layouts_updated_at ON fridge_layouts;
CREATE TRIGGER set_fridge_layouts_updated_at
BEFORE UPDATE ON fridge_layouts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_magnet_positions_updated_at ON magnet_positions;
CREATE TRIGGER set_magnet_positions_updated_at
BEFORE UPDATE ON magnet_positions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE fridge_layouts
DROP CONSTRAINT IF EXISTS fridge_layouts_theme_check;

ALTER TABLE fridge_layouts
ADD CONSTRAINT fridge_layouts_theme_check
CHECK (theme IN ('white', 'black', 'retro', 'pastel_pink', 'pastel_blue'));

ALTER TABLE fridge_layouts
DROP CONSTRAINT IF EXISTS fridge_layouts_size_check;

ALTER TABLE fridge_layouts
ADD CONSTRAINT fridge_layouts_size_check
CHECK (size IN ('small', 'medium', 'large'));
