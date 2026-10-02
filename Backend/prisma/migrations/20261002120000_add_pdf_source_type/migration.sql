DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'SourceType'
    ) THEN
        CREATE TYPE "SourceType" AS ENUM ('URL', 'YOUTUBE', 'PDF');
    ELSE
        ALTER TYPE "SourceType" ADD VALUE IF NOT EXISTS 'PDF';
    END IF;
END
$$;

ALTER TABLE "Source"
    ADD COLUMN IF NOT EXISTS "sourceType" "SourceType" NOT NULL DEFAULT 'URL',
    ADD COLUMN IF NOT EXISTS "storagePath" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

UPDATE "Source"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

ALTER TABLE "Source"
    ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Message_workspaceId_createdAt_id_idx"
    ON "Message" ("workspaceId", "createdAt", "id");