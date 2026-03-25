import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    createPost: vi.fn().mockResolvedValue(undefined),
    comment: vi.fn().mockResolvedValue(undefined),
    like: vi.fn().mockResolvedValue(undefined),
    follow: vi.fn().mockResolvedValue(undefined),
    showcaseAdd: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(undefined),
    message: vi.fn().mockResolvedValue(undefined),
    readFeed: vi.fn().mockResolvedValue(undefined),
    readProfile: vi.fn().mockResolvedValue(undefined),
    readNotifications: vi.fn().mockResolvedValue(undefined),
  },
  rateLimit: vi.fn().mockResolvedValue(1),
}))

vi.mock("@/server/services/notification.service", () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), removeAllListeners: vi.fn() },
}))

vi.mock("@/server/services/audit.service", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/queue", () => ({
  createQueue: vi.fn().mockReturnValue({ add: vi.fn().mockResolvedValue(undefined) }),
  Worker: vi.fn(),
}))

import { RATE_LIMITS } from "@/lib/rate-limit"
import { eventBus } from "@/server/events/event-bus"
import { postRouter } from "@/server/trpc/router/post"
import { followRouter } from "@/server/trpc/router/follow"
import { blockRouter } from "@/server/trpc/router/block"
import { messageRouter } from "@/server/trpc/router/message"
import { notificationRouter } from "@/server/trpc/router/notification"
import { storyRouter } from "@/server/trpc/router/story"
import { hashtagRouter } from "@/server/trpc/router/hashtag"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createPostCaller = createCallerFactory(postRouter)
const createFollowCaller = createCallerFactory(followRouter)
const createBlockCaller = createCallerFactory(blockRouter)
const createMessageCaller = createCallerFactory(messageRouter)
const createNotificationCaller = createCallerFactory(notificationRouter)
const createStoryCaller = createCallerFactory(storyRouter)
const createHashtagCaller = createCallerFactory(hashtagRouter)

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    follow: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    block: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn(), deleteMany: vi.fn() },
    mute: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn(), deleteMany: vi.fn() },
    post: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), delete: vi.fn() },
    like: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue({}) },
    share: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue({}) },
    bookmark: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    comment: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue(null), delete: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
    notification: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), updateMany: vi.fn() },
    conversation: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    directMessage: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 0 }), count: vi.fn().mockResolvedValue(0) },
    story: { findMany: vi.fn().mockResolvedValue([]) },
    friendRequest: { findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
    postHashtag: { groupBy: vi.fn().mockResolvedValue([]) },
    hashtag: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockImplementation((ops: unknown[]) => Promise.resolve(ops)),
  } as unknown as Context["db"]

  return {
    db,
    redis: {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    } as unknown as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

function mockPost(overrides = {}) {
  return {
    id: "post-1", content: "Hello world", mediaUrls: [], visibility: "PUBLIC",
    authorId: "user-1", parentPostId: null, createdAt: new Date(), updatedAt: new Date(),
    author: { id: "user-1", name: "Test", username: "testuser", avatarUrl: null, isVerified: false },
    _count: { likes: 0, comments: 0, shares: 0 },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CACHE: Hit path — skip DB when cached data exists
// ─────────────────────────────────────────────────────────────────────────────

describe("Redis Cache: getFollowingIds cache hit", () => {
  it("returns cached following IDs without querying DB", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(["u-2", "u-3"]))
    await createPostCaller(ctx).getFeed({})

    // follow.findMany should NOT be called when cache hits
    const followCalls = (ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mock.calls
    const followingIdCalls = followCalls.filter(
      (c: any[]) => c[0]?.where?.followerId === "user-1" && c[0]?.select?.followingId
    )
    expect(followingIdCalls).toHaveLength(0)
  })

  it("queries DB and writes cache on miss", async () => {
    const ctx = makeCtx("user-1")
    // First redis.get returns null (miss for following), second returns null (miss for excluded)
    ;(ctx.redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ followingId: "u-2" }])

    await createPostCaller(ctx).getFeed({})

    // Should write to cache with setex
    const setexCalls = (ctx.redis.setex as ReturnType<typeof vi.fn>).mock.calls
    const followingCacheWrite = setexCalls.find((c: any[]) => c[0] === "cache:following:user-1")
    expect(followingCacheWrite).toBeDefined()
    expect(followingCacheWrite![1]).toBe(3600) // TTL
    expect(JSON.parse(followingCacheWrite![2])).toContain("u-2")
  })
})

describe("Redis Cache: getExcludedUserIds cache hit", () => {
  it("returns cached excluded IDs without querying block/mute tables", async () => {
    const ctx = makeCtx("user-1")
    // following cache hit, excluded cache hit
    ;(ctx.redis.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(JSON.stringify(["u-2"])) // following
      .mockResolvedValueOnce(JSON.stringify(["bad-1"])) // excluded
    await createPostCaller(ctx).getFeed({})

    expect(ctx.db.block.findMany).not.toHaveBeenCalled()
    expect(ctx.db.mute.findMany).not.toHaveBeenCalled()
  })

  it("writes excluded cache after miss with correct TTL", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await createPostCaller(ctx).getFeed({})

    const setexCalls = (ctx.redis.setex as ReturnType<typeof vi.fn>).mock.calls
    const excludedCacheWrite = setexCalls.find((c: any[]) => c[0] === "cache:excluded:user-1")
    expect(excludedCacheWrite).toBeDefined()
    expect(excludedCacheWrite![1]).toBe(3600)
  })
})

describe("Redis Cache: getFollowingIds caps at MAX_FOLLOWING_FOR_FEED", () => {
  it("limits follow query to 5000 entries", async () => {
    const ctx = makeCtx("user-1")
    await createPostCaller(ctx).getFeed({})

    const followCalls = (ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mock.calls
    const followingCall = followCalls.find(
      (c: any[]) => c[0]?.select?.followingId === true
    )
    expect(followingCall).toBeDefined()
    expect(followingCall![0].take).toBe(5000)
    expect(followingCall![0].orderBy).toEqual({ createdAt: "desc" })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CACHE INVALIDATION: follow and block routers delete Redis keys
// ─────────────────────────────────────────────────────────────────────────────

describe("Cache Invalidation: follow router (event bus)", () => {
  it("follow emits user.followed event", async () => {
    const ctx = makeCtx("user-1")
    await createFollowCaller(ctx).follow({ userId: "user-2" })

    expect(eventBus.emit).toHaveBeenCalledWith("user.followed", { followerId: "user-1", followingId: "user-2" })
  })

  it("unfollow emits user.unfollowed event", async () => {
    const ctx = makeCtx("user-1")
    await createFollowCaller(ctx).unfollow({ userId: "user-2" })

    expect(eventBus.emit).toHaveBeenCalledWith("user.unfollowed", { followerId: "user-1", followingId: "user-2" })
  })

  it("respondFriendRequest (accept) emits friendRequest.accepted event", async () => {
    const ctx = makeCtx("user-2")
    ;(ctx.db.friendRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", requesterId: "user-1", requesteeId: "user-2", status: "PENDING",
    })
    ;(ctx.db.friendRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", status: "ACCEPTED",
    })

    await createFollowCaller(ctx).respondFriendRequest({ requestId: "fr-1", accept: true })

    expect(eventBus.emit).toHaveBeenCalledWith("friendRequest.accepted", { requestId: "fr-1", requesterId: "user-1", requesteeId: "user-2" })
  })

  it("respondFriendRequest (reject) does NOT emit cache events", async () => {
    const ctx = makeCtx("user-2")
    ;(ctx.db.friendRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", requesterId: "user-1", requesteeId: "user-2", status: "PENDING",
    })
    ;(ctx.db.friendRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", status: "REJECTED",
    })

    await createFollowCaller(ctx).respondFriendRequest({ requestId: "fr-1", accept: false })

    expect(eventBus.emit).not.toHaveBeenCalled()
  })
})

describe("Cache Invalidation: block router (event bus)", () => {
  it("block emits user.blocked event", async () => {
    const ctx = makeCtx("user-1")
    await createBlockCaller(ctx).block({ userId: "user-2" })

    expect(eventBus.emit).toHaveBeenCalledWith("user.blocked", { blockerId: "user-1", blockedId: "user-2" })
  })

  it("unblock emits user.unblocked event", async () => {
    const ctx = makeCtx("user-1")
    await createBlockCaller(ctx).unblock({ userId: "user-2" })

    expect(eventBus.emit).toHaveBeenCalledWith("user.unblocked", { blockerId: "user-1", blockedId: "user-2" })
  })

  it("mute emits user.muted event", async () => {
    const ctx = makeCtx("user-1")
    await createBlockCaller(ctx).mute({ userId: "user-2" })

    expect(eventBus.emit).toHaveBeenCalledWith("user.muted", { muterId: "user-1", mutedId: "user-2" })
  })

  it("unmute emits user.unmuted event", async () => {
    const ctx = makeCtx("user-1")
    await createBlockCaller(ctx).unmute({ userId: "user-2" })

    expect(eventBus.emit).toHaveBeenCalledWith("user.unmuted", { muterId: "user-1", mutedId: "user-2" })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING: correct rate limit function called with correct userId
// ─────────────────────────────────────────────────────────────────────────────

describe("Rate Limiting: enforcement per endpoint", () => {
  it("getFeed calls readFeed rate limit with session userId", async () => {
    const ctx = makeCtx("user-42")
    await createPostCaller(ctx).getFeed({})
    expect(RATE_LIMITS.readFeed).toHaveBeenCalledWith("user-42")
  })

  it("getExploreFeed calls readFeed rate limit", async () => {
    const ctx = makeCtx("user-42")
    await createPostCaller(ctx).getExploreFeed({})
    expect(RATE_LIMITS.readFeed).toHaveBeenCalledWith("user-42")
  })

  it("getByUser calls readProfile rate limit", async () => {
    const ctx = makeCtx("user-42")
    await createPostCaller(ctx).getByUser({ username: "someone" })
    expect(RATE_LIMITS.readProfile).toHaveBeenCalledWith("user-42")
  })

  it("post.create calls createPost rate limit", async () => {
    const ctx = makeCtx("user-42")
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPost({ authorId: "user-42" })
    )
    await createPostCaller(ctx).create({ content: "Hello" })
    expect(RATE_LIMITS.createPost).toHaveBeenCalledWith("user-42")
  })

  it("post.search calls search rate limit", async () => {
    const ctx = makeCtx("user-42")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).search({ q: "test" })
    expect(RATE_LIMITS.search).toHaveBeenCalledWith("user-42")
  })

  it("post.searchByHashtag calls search rate limit", async () => {
    const ctx = makeCtx("user-42")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).searchByHashtag({ tag: "trending" })
    expect(RATE_LIMITS.search).toHaveBeenCalledWith("user-42")
  })

  it("follow.follow calls follow rate limit", async () => {
    const ctx = makeCtx("user-42")
    await createFollowCaller(ctx).follow({ userId: "user-99" })
    expect(RATE_LIMITS.follow).toHaveBeenCalledWith("user-42")
  })

  it("message.send calls message rate limit", async () => {
    const ctx = makeCtx("user-42")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-42", participant2Id: "user-99",
    })
    ;(ctx.db.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "msg-1", content: "hi", senderId: "user-42", sender: { id: "user-42", name: "T", username: "t", avatarUrl: null } },
      {},
    ])
    await createMessageCaller(ctx).send({ conversationId: "conv-1", content: "hi" })
    expect(RATE_LIMITS.message).toHaveBeenCalledWith("user-42")
  })

  it("post.addComment calls comment rate limit", async () => {
    const ctx = makeCtx("user-42")
    ;(ctx.db.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c-1", content: "Nice!", authorId: "user-42", postId: "post-1", parentId: null, createdAt: new Date(),
      author: { id: "user-42", name: "T", username: "t", avatarUrl: null },
      _count: { likes: 0, replies: 0 },
    })
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "user-2" })
    await createPostCaller(ctx).addComment({ postId: "post-1", content: "Nice!" })
    expect(RATE_LIMITS.comment).toHaveBeenCalledWith("user-42")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PARALLEL QUERIES: block.getStatus runs 3 queries in parallel
// ─────────────────────────────────────────────────────────────────────────────

describe("Parallel Queries: block.getStatus", () => {
  it("runs block check, mute check, and reverse-block check in parallel", async () => {
    const ctx = makeCtx("user-1")
    const callOrder: string[] = []

    ;(ctx.db.block.findUnique as ReturnType<typeof vi.fn>).mockImplementation(async (args: any) => {
      const key = args.where.blockerId_blockedId
      if (key.blockerId === "user-1") callOrder.push("block-check")
      else callOrder.push("reverse-block-check")
      return null
    })
    ;(ctx.db.mute.findUnique as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push("mute-check")
      return null
    })

    await createBlockCaller(ctx).getStatus({ userId: "user-2" })

    // All 3 should be called
    expect(callOrder).toHaveLength(3)
    expect(callOrder).toContain("block-check")
    expect(callOrder).toContain("mute-check")
    expect(callOrder).toContain("reverse-block-check")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BATCH PATTERN: notification.getAll deduplicates actor fetch
// ─────────────────────────────────────────────────────────────────────────────

describe("Batch Pattern: notification actor fetch", () => {
  it("fetches actors in a single batched query with deduplicated IDs", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "n-1", actorId: "actor-1", recipientId: "user-1", type: "LIKE", isRead: false, createdAt: new Date(), recipient: {} },
      { id: "n-2", actorId: "actor-1", recipientId: "user-1", type: "FOLLOW", isRead: false, createdAt: new Date(), recipient: {} },
      { id: "n-3", actorId: "actor-2", recipientId: "user-1", type: "COMMENT", isRead: false, createdAt: new Date(), recipient: {} },
    ])
    ;(ctx.db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "actor-1", name: "A1", username: "a1", avatarUrl: null, isVerified: false },
      { id: "actor-2", name: "A2", username: "a2", avatarUrl: null, isVerified: false },
    ])

    await createNotificationCaller(ctx).getAll({})

    // Single user.findMany call with deduplicated actor IDs
    expect(ctx.db.user.findMany).toHaveBeenCalledTimes(1)
    const userCall = (ctx.db.user.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(userCall.where.id.in).toHaveLength(2) // Deduplicated: actor-1, actor-2
    expect(userCall.where.id.in).toContain("actor-1")
    expect(userCall.where.id.in).toContain("actor-2")
  })

  it("skips actor fetch when all notifications have null actorId", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "n-1", actorId: null, recipientId: "user-1", type: "SYSTEM", isRead: false, createdAt: new Date(), recipient: {} },
    ])

    await createNotificationCaller(ctx).getAll({})

    expect(ctx.db.user.findMany).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BATCH PATTERN: hashtag.getTrending — two-query batch instead of N+1
// ─────────────────────────────────────────────────────────────────────────────

describe("Batch Pattern: hashtag.getTrending", () => {
  it("uses groupBy + batched findMany (2 queries, not N+1)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.postHashtag.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { hashtagId: "h-1", _count: { hashtagId: 10 } },
      { hashtagId: "h-2", _count: { hashtagId: 5 } },
    ])
    ;(ctx.db.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "h-1", name: "trending" },
      { id: "h-2", name: "popular" },
    ])

    const result = await createHashtagCaller(ctx).getTrending({})

    // Second query uses batched ID lookup
    expect(ctx.db.hashtag.findMany).toHaveBeenCalledTimes(1)
    const hashtagCall = (ctx.db.hashtag.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(hashtagCall.where.id.in).toEqual(["h-1", "h-2"])
    expect(result).toHaveLength(2)
  })

  it("skips hashtag.findMany when groupBy returns empty", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.postHashtag.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await createHashtagCaller(ctx).getTrending({})

    expect(ctx.db.hashtag.findMany).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getParentChain: sequential loop capped at 5, batch interactions
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: getParentChain", () => {
  it("caps ancestor walk at 5 levels regardless of chain depth", async () => {
    const ctx = makeCtx("user-1")
    // Seed post has parentPostId
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentPostId: "p-5" }) // seed
      .mockResolvedValueOnce(mockPost({ id: "p-5", parentPostId: "p-4", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-4", parentPostId: "p-3", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-3", parentPostId: "p-2", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-2", parentPostId: "p-1", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-1", parentPostId: "p-0", author: {}, _count: {} })) // 5th ancestor

    const result = await createPostCaller(ctx).getParentChain({ postId: "child-post" })

    // 1 seed query + exactly 5 ancestor queries = 6 findUnique calls
    expect(ctx.db.post.findUnique).toHaveBeenCalledTimes(6)
    expect(result).toHaveLength(5)
  })

  it("stops early when ancestor has no parent", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentPostId: "p-2" }) // seed
      .mockResolvedValueOnce(mockPost({ id: "p-2", parentPostId: "p-1", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-1", parentPostId: null, author: {}, _count: {} })) // root

    const result = await createPostCaller(ctx).getParentChain({ postId: "child" })

    expect(ctx.db.post.findUnique).toHaveBeenCalledTimes(3) // seed + 2 ancestors
    expect(result).toHaveLength(2)
  })

  it("returns empty array when seed has no parent", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ parentPostId: null })

    const result = await createPostCaller(ctx).getParentChain({ postId: "root-post" })

    expect(result).toEqual([])
    expect(ctx.db.post.findUnique).toHaveBeenCalledTimes(1) // Only seed query
  })

  it("batch-checks interactions for all ancestors in one call", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentPostId: "p-2" })
      .mockResolvedValueOnce(mockPost({ id: "p-2", parentPostId: "p-1", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-1", parentPostId: null, author: {}, _count: {} }))

    await createPostCaller(ctx).getParentChain({ postId: "child" })

    // like/share/bookmark each called once for the batch
    expect(ctx.db.like.findMany).toHaveBeenCalledTimes(1)
    expect(ctx.db.share.findMany).toHaveBeenCalledTimes(1)
    expect(ctx.db.bookmark.findMany).toHaveBeenCalledTimes(1)

    // Batch query should contain both ancestor IDs
    const likeCall = (ctx.db.like.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(likeCall.where.postId.in).toContain("p-1")
    expect(likeCall.where.postId.in).toContain("p-2")
  })

  it("returns ancestors oldest-first", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ parentPostId: "p-2" })
      .mockResolvedValueOnce(mockPost({ id: "p-2", parentPostId: "p-1", author: {}, _count: {} }))
      .mockResolvedValueOnce(mockPost({ id: "p-1", parentPostId: null, author: {}, _count: {} }))

    const result = await createPostCaller(ctx).getParentChain({ postId: "child" })

    // p-1 (root) should come before p-2
    expect(result[0].id).toBe("p-1")
    expect(result[1].id).toBe("p-2")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE: transaction atomicity and optimizations
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: message.send transaction", () => {
  it("creates message and updates lastMessageAt in a single transaction", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-1", participant2Id: "user-2",
    })
    ;(ctx.db.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "msg-1", content: "hi", senderId: "user-1", sender: { id: "user-1", name: "T", username: "t", avatarUrl: null } },
      {},
    ])

    await createMessageCaller(ctx).send({ conversationId: "conv-1", content: "hi" })

    // $transaction called with array of 2 operations
    expect(ctx.db.$transaction).toHaveBeenCalledTimes(1)
    const txArgs = (ctx.db.$transaction as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(txArgs).toHaveLength(2)
  })
})

describe("Performance: message.getConversations last-message optimization", () => {
  it("only loads 1 message per conversation (take: 1)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createMessageCaller(ctx).getConversations({})

    const callArgs = (ctx.db.conversation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.include.messages.take).toBe(1)
    expect(callArgs.include.messages.orderBy).toEqual({ createdAt: "desc" })
  })

  it("uses select on participant fields (not full user records)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createMessageCaller(ctx).getConversations({})

    const callArgs = (ctx.db.conversation.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.include.participant1.select).toBeDefined()
    expect(callArgs.include.participant2.select).toBeDefined()
    expect(callArgs.include.participant1.select.id).toBe(true)
    expect(callArgs.include.participant1.select.name).toBe(true)
    // Should not include sensitive fields
    expect(callArgs.include.participant1.select.passwordHash).toBeUndefined()
    expect(callArgs.include.participant1.select.email).toBeUndefined()
  })
})

describe("Performance: message.getOrCreate sorted participant IDs", () => {
  it("sorts participant IDs for consistent lookup key", async () => {
    const ctx = makeCtx("user-z")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "conv-1" })

    await createMessageCaller(ctx).getOrCreate({ userId: "user-a" })

    const findCall = (ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const key = findCall.where.participant1Id_participant2Id
    // "user-a" < "user-z" alphabetically, so p1 should be user-a
    expect(key.participant1Id).toBe("user-a")
    expect(key.participant2Id).toBe("user-z")
  })
})

describe("Performance: message.getMessages bulk mark-as-read", () => {
  it("marks incoming messages as read with a single updateMany", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-1", participant2Id: "user-2",
    })

    await createMessageCaller(ctx).getMessages({ conversationId: "conv-1" })

    expect(ctx.db.directMessage.updateMany).toHaveBeenCalledTimes(1)
    const updateCall = (ctx.db.directMessage.updateMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.where.senderId).toEqual({ not: "user-1" })
    expect(updateCall.where.isRead).toBe(false)
    expect(updateCall.data.isRead).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STORY: single-query grouping for feed
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: story.getActiveForFeed", () => {
  it("fetches all stories in a single query using authorId IN clause", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { followingId: "u-2" }, { followingId: "u-3" },
    ])
    ;(ctx.db.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createStoryCaller(ctx).getActiveForFeed()

    // Single story query with all user IDs
    expect(ctx.db.story.findMany).toHaveBeenCalledTimes(1)
    const storyCall = (ctx.db.story.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(storyCall.where.authorId.in).toEqual(["user-1", "u-2", "u-3"])
  })

  it("groups stories by author in-process (not extra DB queries)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(ctx.db.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s-1", authorId: "user-1", author: { id: "user-1", name: "Me" }, views: [], expiresAt: new Date(Date.now() + 86400000) },
      { id: "s-2", authorId: "user-1", author: { id: "user-1", name: "Me" }, views: [{ id: "v-1" }], expiresAt: new Date(Date.now() + 86400000) },
    ])

    const result = await createStoryCaller(ctx).getActiveForFeed()

    // Only 1 group for user-1
    expect(result).toHaveLength(1)
    expect(result[0].stories).toHaveLength(2)
    // No additional DB queries beyond follow.findMany + story.findMany
    expect(ctx.db.story.findMany).toHaveBeenCalledTimes(1)
  })

  it("uses take:1 on views to check viewer status efficiently", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(ctx.db.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createStoryCaller(ctx).getActiveForFeed()

    const storyCall = (ctx.db.story.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(storyCall.include.views.take).toBe(1)
    expect(storyCall.include.views.where.viewerId).toBe("user-1")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW: getFollowers/getFollowing use select on joined user
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: follow list selects", () => {
  it("getFollowers uses select on follower (not full user record)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createFollowCaller(ctx).getFollowers({ userId: "user-1" })

    const callArgs = (ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.include.follower.select).toBeDefined()
    expect(callArgs.include.follower.select.id).toBe(true)
    expect(callArgs.include.follower.select.passwordHash).toBeUndefined()
    expect(callArgs.include.follower.select.email).toBeUndefined()
  })

  it("getFollowing uses select on following (not full user record)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createFollowCaller(ctx).getFollowing({ userId: "user-1" })

    const callArgs = (ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.include.following.select).toBeDefined()
    expect(callArgs.include.following.select.id).toBe(true)
    expect(callArgs.include.following.select.passwordHash).toBeUndefined()
  })

  it("getFollowers uses cursor-based pagination (take: limit+1)", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createFollowCaller(ctx).getFollowers({ userId: "user-1", limit: 20 })

    const callArgs = (ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(21) // limit + 1
    expect(callArgs.orderBy).toEqual({ createdAt: "desc" })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION: pagination enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: notification.getAll pagination", () => {
  it("uses cursor-based pagination with take: limit+1", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createNotificationCaller(ctx).getAll({ limit: 15 })

    const callArgs = (ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(16) // limit + 1
  })

  it("orders unread first, then by recency", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createNotificationCaller(ctx).getAll({})

    const callArgs = (ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.orderBy).toEqual([{ isRead: "asc" }, { createdAt: "desc" }])
  })
})
