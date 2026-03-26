-- Phase 3: Close Friends List, Feed Algorithm Preference, Link Previews

-- 1. Feed Algorithm Preference on User
ALTER TABLE "users" ADD COLUMN "feedAlgorithm" TEXT NOT NULL DEFAULT 'CHRONOLOGICAL';

-- 2. CLOSE_FRIENDS visibility enum value
ALTER TYPE "Visibility" ADD VALUE 'CLOSE_FRIENDS';

-- 3. Close Friends table
CREATE TABLE "close_friends" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "friendId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "close_friends_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_friends_userId_friendId_key" UNIQUE ("userId", "friendId"),
  CONSTRAINT "close_friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_friends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "close_friends_userId_idx" ON "close_friends"("userId");

-- 4. Link Previews table
CREATE TABLE "link_previews" (
  "id"          TEXT NOT NULL,
  "postId"      TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "title"       TEXT,
  "description" TEXT,
  "imageUrl"    TEXT,
  "siteName"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "link_previews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "link_previews_postId_key" UNIQUE ("postId"),
  CONSTRAINT "link_previews_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "link_previews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "link_previews_userId_idx" ON "link_previews"("userId");
