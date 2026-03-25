-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "EmbeddingEntityType" AS ENUM ('POST', 'USER');

-- CreateTable
CREATE TABLE "embeddings" (
    "id" TEXT NOT NULL,
    "entityType" "EmbeddingEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "vector" vector(384) NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_entityType_entityId_key" ON "embeddings"("entityType", "entityId");
CREATE INDEX "embeddings_entityType_idx" ON "embeddings"("entityType");

-- HNSW index for fast cosine similarity search
CREATE INDEX "embeddings_vector_cosine_idx" ON "embeddings"
    USING hnsw (vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
