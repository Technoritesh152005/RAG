CREATE INDEX IF NOT EXISTS "Message_workspaceId_createdAt_id_idx"
ON "Message" ("workspaceId", "createdAt", "id");