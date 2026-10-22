WITH ranked_active_states AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "cropId" ORDER BY "order", "createdAt", "id") AS active_rank
  FROM "CropState"
  WHERE "isActive" = true
)
UPDATE "CropState"
SET "isActive" = false
FROM ranked_active_states
WHERE "CropState"."id" = ranked_active_states."id"
  AND ranked_active_states.active_rank > 1;

CREATE UNIQUE INDEX "CropState_one_active_per_crop"
ON "CropState" ("cropId")
WHERE "isActive" = true;

ALTER TABLE "Node" DROP CONSTRAINT "Node_stateId_fkey";
ALTER TABLE "Node"
ADD CONSTRAINT "Node_stateId_fkey"
FOREIGN KEY ("stateId") REFERENCES "CropState"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
