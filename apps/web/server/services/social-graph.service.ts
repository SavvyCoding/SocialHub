import type { PrismaClient } from "@prisma/client"
import type Redis from "ioredis"

const EXCLUDED_CACHE_TTL = 3600
const FOLLOWING_CACHE_TTL = 3600
const MAX_FOLLOWING_FOR_FEED = 5000

export async function getExcludedUserIds(db: PrismaClient, redis: Redis, userId: string): Promise<string[]> {
  const cacheKey = `cache:excluded:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const [blocked, muted] = await Promise.all([
    db.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } }),
    db.mute.findMany({ where: { muterId: userId }, select: { mutedId: true } }),
  ])
  const ids = [
    ...blocked.map((b: { blockerId: string; blockedId: string }) => (b.blockerId === userId ? b.blockedId : b.blockerId)),
    ...muted.map((m: { mutedId: string }) => m.mutedId),
  ]
  await redis.setex(cacheKey, EXCLUDED_CACHE_TTL, JSON.stringify(ids))
  return ids
}

export async function getFollowingIds(db: PrismaClient, redis: Redis, userId: string): Promise<string[]> {
  const cacheKey = `cache:following:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
    take: MAX_FOLLOWING_FOR_FEED,
    orderBy: { createdAt: "desc" },
  })
  const ids = following.map((f) => f.followingId)
  await redis.setex(cacheKey, FOLLOWING_CACHE_TTL, JSON.stringify(ids))
  return ids
}

export async function invalidateUserCaches(redis: Redis, userId: string) {
  await redis.del(`cache:following:${userId}`, `cache:excluded:${userId}`)
}

interface InteractionFlags {
  isLiked: boolean
  isShared: boolean
  isBookmarked: boolean
}

export async function batchGetInteractions(
  db: PrismaClient,
  userId: string,
  postIds: string[]
): Promise<Map<string, InteractionFlags>> {
  if (postIds.length === 0) return new Map()

  const [likes, shares, bookmarks] = await Promise.all([
    db.like.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
    db.share.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
    db.bookmark.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
  ])

  const likedSet = new Set(likes.map((l) => l.postId))
  const sharedSet = new Set(shares.map((s) => s.postId))
  const bookmarkedSet = new Set(bookmarks.map((b) => b.postId))

  const result = new Map<string, InteractionFlags>()
  for (const id of postIds) {
    result.set(id, {
      isLiked: likedSet.has(id),
      isShared: sharedSet.has(id),
      isBookmarked: bookmarkedSet.has(id),
    })
  }
  return result
}

export const authorSelect = { id: true, name: true, username: true, avatarUrl: true, isVerified: true } as const
export const countSelect = { likes: true, comments: true, shares: true } as const
export const postExtraSelect = { viewCount: true, isPinned: true, pinnedAt: true } as const
