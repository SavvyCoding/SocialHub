# Daily Feature Plan — 2026-03-26

## Phase 1 (Simpler)
1. Post View Count Display — Show view count on each post card alongside likes/comments; increment on post detail view
2. User Pronouns — Add pronouns field to user profile (stored on User model, shown on profile)
3. Comment Reactions — Allow emoji reactions on comments (reuse existing ReactionType); show reaction counts on comments

## Phase 2 (Medium)
4. Post Tags / Topics — Allow posts to be tagged with up to 3 free-form topic tags; display on posts; filter feed by tag
5. User Badge System — Award badges (EARLY_ADOPTER, POWER_USER, TOP_CONTRIBUTOR) stored per user; displayed on profile
6. Trending Posts — Trending feed endpoint ranking posts by engagement velocity (likes + comments in last 24h)

## Phase 3 (Complex)
7. Post Impressions Analytics — Track unique post impressions; author can query impression count for their posts
8. Follower Milestones — Notify users when hitting follower milestones (10, 50, 100, 500, 1000); store milestone on user
9. Content Warnings / Spoiler Tags — Posts can carry a content warning label; UI hides content behind "Show" toggle

---

## Implementation Status
- Phase 1: COMPLETE (committed 2026-03-26)
- Phase 2: COMPLETE (committed 2026-03-26)
- Phase 3: COMPLETE (committed 2026-03-26)
