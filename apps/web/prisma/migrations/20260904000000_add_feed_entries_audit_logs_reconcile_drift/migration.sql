-- Reconcile schema drift: tables that were in schema.prisma but never had a migration,
-- plus column/index differences found by `prisma migrate diff` against the live database.
-- (collections, muted_keywords and posts_originalPostId_fkey are handled by the
--  20260325200000_add_collections and 20260325300000_add_quick_wins migrations.)

-- Feed fan-out entries (FeedEntry model)
CREATE TABLE IF NOT EXISTS "feed_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "feed_entries_userId_createdAt_idx" ON "feed_entries"("userId", "createdAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "feed_entries_userId_postId_key" ON "feed_entries"("userId", "postId");

-- Audit log (AuditLog model)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_resource_action_idx" ON "audit_logs"("resource", "action");

-- Post indexes declared in schema.prisma but missing from the database
CREATE INDEX IF NOT EXISTS "posts_createdAt_idx" ON "posts"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "posts_visibility_createdAt_idx" ON "posts"("visibility", "createdAt" DESC);

-- notification_preferences.notificationType was created as TEXT; schema declares the NotificationType enum.
-- Converted in place (no drop/recreate) so any existing rows are preserved.
ALTER TABLE "notification_preferences"
  ALTER COLUMN "notificationType" TYPE "NotificationType" USING "notificationType"::"NotificationType";

-- @updatedAt columns are maintained by Prisma; the DB default is not part of the schema.
ALTER TABLE "notification_preferences" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "post_reports" ALTER COLUMN "updatedAt" DROP DEFAULT;
