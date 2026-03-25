-- Post: scheduled posts
ALTER TABLE "posts" ADD COLUMN "scheduledAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- ReactionType enum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'CURIOUS');

-- Like: add reaction type
ALTER TABLE "likes" ADD COLUMN "reactionType" "ReactionType" NOT NULL DEFAULT 'LIKE';

-- Polls
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "polls_postId_key" ON "polls"("postId");
ALTER TABLE "polls" ADD CONSTRAINT "polls_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "poll_options_pollId_idx" ON "poll_options"("pollId");
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "poll_votes_userId_pollId_key" ON "poll_votes"("userId", "pollId");
CREATE INDEX "poll_votes_pollId_idx" ON "poll_votes"("pollId");
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
