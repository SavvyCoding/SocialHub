# Daily Feature Plan — 2026-03-25

## Phase 1 (Simpler)
1. Post Drafts — isDraft flag on Post; saveDraft / getDrafts / publishDraft procedures; drafts excluded from all feeds
2. Comment Pinning — isPinned flag on Comment; pinComment / unpinComment mutations; pinned comment shown first
3. Profile View Counter — profileViews counter on User; recordProfileView + getProfileViews; shown on profile page

## Phase 2 (Medium)
4. Post Report System — PostReport model with reason enum + status; reportPost mutation + getMyReports query
5. Mutual Followers — getMutualFollowers(username) returning users both parties follow in common (no schema change)
6. Bookmark Folders — folder field on Bookmark; updateBookmarkFolder + getBookmarksByFolder procedures

## Phase 3 (Complex)
7. Close Friends List — CloseFriend join model + CLOSE_FRIENDS Visibility enum value; add/remove/list close friends
8. Feed Algorithm Preference — feedAlgorithm field on User (CHRONOLOGICAL / ENGAGEMENT / MIXED); getFeed respects it
9. Link Preview Cards — LinkPreview model (url, title, description, imageUrl per post); storeLinkPreview + getLinkPreview

---

## Implementation Status
- Phase 1: PENDING
- Phase 2: PENDING
- Phase 3: PENDING
