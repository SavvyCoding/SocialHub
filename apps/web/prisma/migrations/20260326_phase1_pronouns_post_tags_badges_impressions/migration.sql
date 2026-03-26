-- 2026-03-26: Phase 1 — User Pronouns, Post Tags, User Badges, Post Impressions
-- Also adds followerMilestones column

-- User pronouns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pronouns" TEXT;

-- User follower milestones tracking
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "followerMilestones" INTEGER NOT NULL DEFAULT 0;

-- Post Tags
CREATE TABLE IF NOT EXISTS "post_tags" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_tags_postId_tag_key" ON "post_tags"("postId", "tag");
CREATE INDEX IF NOT EXISTS "post_tags_tag_idx" ON "post_tags"("tag");
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User Badges
CREATE TYPE IF NOT EXISTS "BadgeType" AS ENUM ('EARLY_ADOPTER', 'POWER_USER', 'TOP_CONTRIBUTOR');
CREATE TABLE IF NOT EXISTS "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_userId_badgeType_key" ON "user_badges"("userId", "badgeType");
CREATE INDEX IF NOT EXISTS "user_badges_userId_idx" ON "user_badges"("userId");

-- Post Impressions
CREATE TABLE IF NOT EXISTS "post_impressions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_impressions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_impressions_postId_viewerId_key" ON "post_impressions"("postId", "viewerId");
CREATE INDEX IF NOT EXISTS "post_impressions_postId_createdAt_idx" ON "post_impressions"("postId", "createdAt" DESC);
ALTER TABLE "post_impressions" ADD CONSTRAINT "post_impressions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
