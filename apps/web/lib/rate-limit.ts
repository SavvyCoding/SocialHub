import { redis } from "./redis"
import { TRPCError } from "@trpc/server"

interface RateLimitOptions {
  /** Unique identifier for the bucket (e.g. userId + action) */
  key: string
  /** Max requests allowed within the window */
  limit: number
  /** Window size in seconds */
  windowSecs: number
}

/**
 * Redis sliding window rate limiter.
 * Returns the remaining quota. Throws TRPCError TOO_MANY_REQUESTS when exhausted.
 */
export async function rateLimit({ key, limit, windowSecs }: RateLimitOptions): Promise<number> {
  const redisKey = `rl:${key}`
  const now = Date.now()
  const windowStart = now - windowSecs * 1000

  // Use a sorted set: score = timestamp (ms), member = unique request id
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(redisKey, 0, windowStart)         // remove old entries
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`)     // add current request
  pipeline.zcard(redisKey)                                     // count requests in window
  pipeline.expire(redisKey, windowSecs + 1)                   // auto-expire the key

  const results = await pipeline.exec()
  const count = (results?.[2]?.[1] as number) ?? 1

  if (count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many requests. Try again in ${windowSecs} seconds.`,
    })
  }

  return limit - count
}

/** Preset rate limiters for common actions */
export const RATE_LIMITS = {
  /** Post creation: 10 per minute */
  createPost: (userId: string) => rateLimit({ key: `${userId}:post`, limit: 10, windowSecs: 60 }),
  /** Comment: 30 per minute */
  comment: (userId: string) => rateLimit({ key: `${userId}:comment`, limit: 30, windowSecs: 60 }),
  /** Like: 60 per minute */
  like: (userId: string) => rateLimit({ key: `${userId}:like`, limit: 60, windowSecs: 60 }),
  /** Follow: 20 per minute */
  follow: (userId: string) => rateLimit({ key: `${userId}:follow`, limit: 20, windowSecs: 60 }),
  /** Showcase add (book/movie/place/goal): 30 per minute */
  showcaseAdd: (userId: string) => rateLimit({ key: `${userId}:showcase`, limit: 30, windowSecs: 60 }),
  /** Search (geocode, book search, etc.): 30 per minute */
  search: (userId: string) => rateLimit({ key: `${userId}:search`, limit: 30, windowSecs: 60 }),
  /** Direct message: 30 per minute */
  message: (userId: string) => rateLimit({ key: `${userId}:message`, limit: 30, windowSecs: 60 }),

  // ─── Read rate limits ─────────────────────────────────────────────────────
  /** Feed reads: 60 per minute */
  readFeed: (userId: string) => rateLimit({ key: `${userId}:r:feed`, limit: 60, windowSecs: 60 }),
  /** Profile reads: 120 per minute */
  readProfile: (userId: string) => rateLimit({ key: `${userId}:r:profile`, limit: 120, windowSecs: 60 }),
  /** Notification reads: 60 per minute */
  readNotifications: (userId: string) => rateLimit({ key: `${userId}:r:notif`, limit: 60, windowSecs: 60 }),
} as const
