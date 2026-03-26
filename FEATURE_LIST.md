# Daily Feature Plan — 2026-03-25

## Phase 1 (Simpler — no schema changes)
1. Edit Post — allow post authors to edit their post content (and update `updatedAt`) within the existing schema
2. Sort Comments — add `sort` parameter (`newest`, `oldest`, `top`) to `getComments` procedure so clients choose comment order
3. Profile Completion Score — new `user.getProfileScore` procedure that computes a 0–100 completeness score from existing profile fields and showcase sections

## Phase 2 (Medium — minor schema additions)
4. Content Warnings — add `hasSensitiveContent Boolean @default(false)` to Post; posts flagged sensitive blur their media until the viewer clicks to reveal
5. Notification Preferences — new `NotificationPreference` model; users can toggle each `NotificationType` on/off; notification service respects preferences
6. Saved Searches — new `SavedSearch` model; users can save and recall named search queries with a dedicated tRPC router

## Phase 3 (Complex — significant schema + backend + frontend)
7. Draft Posts — add `isDraft Boolean @default(false)` to Post; `saveDraft`, `getDrafts`, and `publishDraft` procedures; drafts excluded from all feed/profile queries
8. Post Report System — new `PostReport` model with `reason` enum and `status`; `report.submit`, `report.getMyReports` procedures; authors get a notification
9. Close Friends List — new `CloseFriend` join model + `CLOSE_FRIENDS` enum value added to `Visibility`; posts with this visibility are only visible to people in the author's close-friends list
