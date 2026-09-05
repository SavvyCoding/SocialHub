-- Phase 2: Content Warnings, Notification Preferences, Saved Searches

-- Content warning flag on posts
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "hasSensitiveContent" BOOLEAN NOT NULL DEFAULT false;

-- Notification preferences
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_notificationType_key"
  ON "notification_preferences"("userId", "notificationType");

CREATE INDEX IF NOT EXISTS "notification_preferences_userId_idx"
  ON "notification_preferences"("userId");

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Saved searches
CREATE TABLE IF NOT EXISTS "saved_searches" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_searches_userId_query_key"
  ON "saved_searches"("userId", "query");

CREATE INDEX IF NOT EXISTS "saved_searches_userId_createdAt_idx"
  ON "saved_searches"("userId", "createdAt" DESC);

ALTER TABLE "saved_searches"
  ADD CONSTRAINT "saved_searches_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
