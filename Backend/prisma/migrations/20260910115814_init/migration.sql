-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'SCRAPING', 'CHUNKING', 'EMBEDDING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "pageCount" INTEGER,
    "chunkCount" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
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

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChunkHash" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usageLog" (
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

-- CreateTable
CREATE TABLE "EvalCase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expectedPageUrls" JSONB NOT NULL,
    "expectedKeyFacts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalRun" (
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

-- CreateTable
CREATE TABLE "EvalResult" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_workspaceId_key" ON "Source"("url", "workspaceId");

-- CreateIndex
CREATE INDEX "Chunk_workspaceId_idx" ON "Chunk"("workspaceId");

-- CreateIndex
CREATE INDEX "Chunk_sourceId_idx" ON "Chunk"("sourceId");

-- CreateIndex
CREATE INDEX "FAQ_workspaceId_idx" ON "FAQ"("workspaceId");

-- CreateIndex
CREATE INDEX "ChunkHash_workspaceId_idx" ON "ChunkHash"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChunkHash_contentHash_workspaceId_key" ON "ChunkHash"("contentHash", "workspaceId");

-- CreateIndex
CREATE INDEX "usageLog_workspaceId_idx" ON "usageLog"("workspaceId");

-- CreateIndex
CREATE INDEX "usageLog_type_idx" ON "usageLog"("type");

-- CreateIndex
CREATE INDEX "EvalCase_workspaceId_idx" ON "EvalCase"("workspaceId");

-- CreateIndex
CREATE INDEX "EvalRun_workspaceId_idx" ON "EvalRun"("workspaceId");

-- CreateIndex
CREATE INDEX "EvalResult_runId_idx" ON "EvalResult"("runId");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalResult" ADD CONSTRAINT "EvalResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
