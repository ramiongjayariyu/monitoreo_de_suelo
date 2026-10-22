UPDATE "Crop" AS crop
SET "ranges" = COALESCE(
  (
    SELECT state."ranges"
    FROM "CropState" AS state
    WHERE state."cropId" = crop."id"
    ORDER BY state."order" ASC
    LIMIT 1
  ),
  '{
    "humidity": {"min": 0, "max": 100},
    "ph": {"min": 0, "max": 14},
    "salinity": {"min": 0, "max": 10},
    "soilTemp": {"min": -10, "max": 60},
    "ambientTemp": {"min": -10, "max": 60}
  }'::jsonb
)
WHERE crop."ranges" = '{}'::jsonb;
