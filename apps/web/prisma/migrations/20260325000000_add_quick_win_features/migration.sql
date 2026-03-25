-- Post: view counts and pinned posts
ALTER TABLE "posts" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "posts" ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- BookEntry: reading progress
ALTER TABLE "book_entries" ADD COLUMN "currentPage" INTEGER;
ALTER TABLE "book_entries" ADD COLUMN "totalPages" INTEGER;

-- MovieEntry: watching progress
ALTER TABLE "movie_entries" ADD COLUMN "currentEpisode" INTEGER;
ALTER TABLE "movie_entries" ADD COLUMN "totalEpisodes" INTEGER;

-- Goal: streaks
ALTER TABLE "goals" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "goals" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "goals" ADD COLUMN "lastActivityAt" TIMESTAMP(3);
