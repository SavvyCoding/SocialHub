-- CreateIndex
CREATE INDEX "blocks_blockerId_idx" ON "blocks"("blockerId");

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE INDEX "book_entries_userId_status_idx" ON "book_entries"("userId", "status");

-- CreateIndex
CREATE INDEX "bookmarks_userId_createdAt_idx" ON "bookmarks"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "educations_userId_idx" ON "educations"("userId");

-- CreateIndex
CREATE INDEX "experiences_userId_idx" ON "experiences"("userId");

-- CreateIndex
CREATE INDEX "follows_followingId_createdAt_idx" ON "follows"("followingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "follows_followerId_createdAt_idx" ON "follows"("followerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "friend_requests_requesteeId_status_idx" ON "friend_requests"("requesteeId", "status");

-- CreateIndex
CREATE INDEX "friend_requests_requesterId_status_idx" ON "friend_requests"("requesterId", "status");

-- CreateIndex
CREATE INDEX "goals_userId_isCompleted_idx" ON "goals"("userId", "isCompleted");

-- CreateIndex
CREATE INDEX "likes_postId_idx" ON "likes"("postId");

-- CreateIndex
CREATE INDEX "likes_commentId_idx" ON "likes"("commentId");

-- CreateIndex
CREATE INDEX "movie_entries_userId_status_mediaType_idx" ON "movie_entries"("userId", "status", "mediaType");

-- CreateIndex
CREATE INDEX "mutes_muterId_idx" ON "mutes"("muterId");

-- CreateIndex
CREATE INDEX "places_userId_idx" ON "places"("userId");

-- CreateIndex
CREATE INDEX "post_hashtags_hashtagId_idx" ON "post_hashtags"("hashtagId");

-- CreateIndex
CREATE INDEX "post_mentions_postId_idx" ON "post_mentions"("postId");

-- CreateIndex
CREATE INDEX "post_mentions_userId_idx" ON "post_mentions"("userId");

-- CreateIndex
CREATE INDEX "sessions_userId_expires_idx" ON "sessions"("userId", "expires");

-- CreateIndex
CREATE INDEX "shares_postId_idx" ON "shares"("postId");

-- CreateIndex
CREATE INDEX "story_views_storyId_idx" ON "story_views"("storyId");

-- CreateIndex
CREATE INDEX "user_skills_userId_idx" ON "user_skills"("userId");
