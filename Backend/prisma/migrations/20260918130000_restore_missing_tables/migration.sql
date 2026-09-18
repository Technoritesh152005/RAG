-- Restore tables removed from the database while the init migration remained marked applied.
CREATE TABLE IF NOT EXISTS "Chunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL,
    "sectionHeading" TEXT NOT NULL,
    "parentText" TEXT NOT NULL,
    "childText" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "parentIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChunkHash" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChunkHash_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EvalCase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedPageUrls" JSONB NOT NULL,
    "expectedKeyFacts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvalCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EvalRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "avgHitRate" DOUBLE PRECISION NOT NULL,
    "avgMRR" DOUBLE PRECISION NOT NULL,
    "avgJudgeScore" DOUBLE PRECISION NOT NULL,
    "confidentRate" DOUBLE PRECISION NOT NULL,
    "avgLatencyMs" INTEGER NOT NULL,
    "p95LatencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EvalResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "retrievedUrls" JSONB NOT NULL,
    "hit" BOOLEAN NOT NULL,
    "reciprocalRank" DOUBLE PRECISION NOT NULL,
    "judgeScore" DOUBLE PRECISION NOT NULL,
    "judgeReasoning" TEXT NOT NULL,
    "confident" BOOLEAN NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "generatedAnswer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvalResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FAQ" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "usageLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "embeddingTokens" INTEGER NOT NULL DEFAULT 0,
    "llmInputTokens" INTEGER NOT NULL DEFAULT 0,
    "llmOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChunkHash_contentHash_workspaceId_key"
    ON "ChunkHash"("contentHash", "workspaceId");
CREATE INDEX IF NOT EXISTS "Chunk_workspaceId_idx" ON "Chunk"("workspaceId");
CREATE INDEX IF NOT EXISTS "Chunk_sourceId_idx" ON "Chunk"("sourceId");
CREATE INDEX IF NOT EXISTS "ChunkHash_workspaceId_idx" ON "ChunkHash"("workspaceId");
CREATE INDEX IF NOT EXISTS "EvalCase_workspaceId_idx" ON "EvalCase"("workspaceId");
CREATE INDEX IF NOT EXISTS "EvalRun_workspaceId_idx" ON "EvalRun"("workspaceId");
CREATE INDEX IF NOT EXISTS "EvalResult_runId_idx" ON "EvalResult"("runId");
CREATE INDEX IF NOT EXISTS "FAQ_workspaceId_idx" ON "FAQ"("workspaceId");
CREATE INDEX IF NOT EXISTS "usageLog_workspaceId_idx" ON "usageLog"("workspaceId");
CREATE INDEX IF NOT EXISTS "usageLog_type_idx" ON "usageLog"("type");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EvalResult_runId_fkey'
    ) THEN
        ALTER TABLE "EvalResult"
            ADD CONSTRAINT "EvalResult_runId_fkey"
            FOREIGN KEY ("runId") REFERENCES "EvalRun"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;