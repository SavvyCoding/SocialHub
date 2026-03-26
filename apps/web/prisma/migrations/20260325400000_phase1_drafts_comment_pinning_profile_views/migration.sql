-- Phase 1: Post Drafts, Comment Pinning, Profile View Counter

-- 1. Post Drafts: isDraft flag
ALTER TABLE "posts" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Comment Pinning: isPinned flag
ALTER TABLE "comments" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Profile View Counter
ALTER TABLE "users" ADD COLUMN "profileViews" INTEGER NOT NULL DEFAULT 0;
