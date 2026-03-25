-- Add self-referential quote relation on posts
-- (originalPostId column already exists — just add the FK constraint)
ALTER TABLE "posts" ADD CONSTRAINT "posts_originalPostId_fkey"
  FOREIGN KEY ("originalPostId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex for quote lookups
CREATE INDEX "posts_originalPostId_idx" ON "posts"("originalPostId");

-- CreateTable muted_keywords
CREATE TABLE "muted_keywords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "muted_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "muted_keywords_userId_keyword_key" ON "muted_keywords"("userId", "keyword");
CREATE INDEX "muted_keywords_userId_idx" ON "muted_keywords"("userId");

-- AddForeignKey
ALTER TABLE "muted_keywords" ADD CONSTRAINT "muted_keywords_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
