-- Phase 2: Post Reports, Mutual Followers (no schema), Bookmark Folders

-- 1. Bookmark Folders
ALTER TABLE "bookmarks" ADD COLUMN "folder" TEXT;

-- 2. Post Reports enums
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE_CONTENT', 'HATE_SPEECH', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- 3. Post Reports table
CREATE TABLE "post_reports" (
  "id"         TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "postId"     TEXT NOT NULL,
  "reason"     "ReportReason" NOT NULL,
  "details"    TEXT,
  "status"     "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_reports_reporterId_postId_key" ON "post_reports"("reporterId", "postId");
CREATE INDEX "post_reports_status_createdAt_idx" ON "post_reports"("status", "createdAt" DESC);
CREATE INDEX "post_reports_reporterId_idx" ON "post_reports"("reporterId");
