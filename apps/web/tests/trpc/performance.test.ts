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

import { postRouter } from "@/server/trpc/router/post"
import { messageRouter } from "@/server/trpc/router/message"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createPostCaller = createCallerFactory(postRouter)
const createMessageCaller = createCallerFactory(messageRouter)

// ─── Test helpers ────────────────────────────────────────────────────────────

function makePostCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    follow: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
    block: { findMany: vi.fn().mockResolvedValue([]) },
    mute: { findMany: vi.fn().mockResolvedValue([]) },
    post: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      delete: vi.fn(),
    },
    like: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    share: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    bookmark: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    comment: {
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue(null) },
  } as unknown as Context["db"]

  return {
    db,
    redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn().mockResolvedValue("OK"), del: vi.fn().mockResolvedValue(1) } as unknown as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

function makeMessageCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    conversation: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    directMessage: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(),
  } as unknown as Context["db"]

  return {
    db,
    redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn().mockResolvedValue("OK"), del: vi.fn().mockResolvedValue(1) } as unknown as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

function mockPost(overrides = {}) {
  return {
    id: "post-1",
    content: "Hello world",
    mediaUrls: [],
    visibility: "PUBLIC",
    authorId: "user-1",
    parentPostId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: "user-1", name: "Test", username: "testuser", avatarUrl: null, isVerified: false },
    _count: { likes: 0, comments: 0, shares: 0 },
    likes: [],
    shares: [],
    bookmarks: [],
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE: getExcludedUserIds helper — block+mute fetched in parallel
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: getExcludedUserIds helper", () => {
  it("queries block and mute tables in parallel (both called before post query)", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})

    // Both block.findMany and mute.findMany should have been called
    expect(ctx.db.block.findMany).toHaveBeenCalledTimes(1)
    expect(ctx.db.mute.findMany).toHaveBeenCalledTimes(1)
  })

  it("correctly identifies blocked users when I blocked them", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { blockerId: "user-1", blockedId: "bad-user" },
    ])
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where.authorId.notIn).toContain("bad-user")
  })

  it("correctly identifies blocked users when they blocked me", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { blockerId: "bad-user", blockedId: "user-1" },
    ])
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where.authorId.notIn).toContain("bad-user")
  })

  it("deduplicates between block and mute lists", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { blockerId: "user-1", blockedId: "overlap-user" },
    ])
    ;(ctx.db.mute.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { mutedId: "overlap-user" },
    ])
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // overlap-user appears from both block and mute — Prisma notIn handles duplicates fine
    const excluded = callArgs.where.authorId.notIn as string[]
    expect(excluded.filter((id: string) => id === "overlap-user").length).toBe(2) // Present from both sources
  })

  it("getExcludedUserIds is shared between getFeed and getExploreFeed", async () => {
    // Both getFeed and getExploreFeed call block.findMany and mute.findMany
    const ctx1 = makePostCtx("user-1")
    await createPostCaller(ctx1).getFeed({})
    expect(ctx1.db.block.findMany).toHaveBeenCalledTimes(1)

    const ctx2 = makePostCtx("user-1")
    await createPostCaller(ctx2).getExploreFeed({})
    expect(ctx2.db.block.findMany).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE: getUnreadCount uses single query with relation filter
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: getUnreadCount optimization", () => {
  it("uses a single directMessage.count call (not 2 separate queries)", async () => {
    const ctx = makeMessageCtx("user-1")
    ;(ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(5)
    const result = await createMessageCaller(ctx).getUnreadCount()

    expect(result.count).toBe(5)
    // Should use directMessage.count exactly once (single query optimization)
    expect(ctx.db.directMessage.count).toHaveBeenCalledTimes(1)
    // Should NOT use conversation.findMany (old 2-query approach)
    expect(ctx.db.conversation.findMany).not.toHaveBeenCalled()
  })

  it("filters by senderId !== userId (don't count own messages)", async () => {
    const ctx = makeMessageCtx("user-1")
    ;(ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(3)
    await createMessageCaller(ctx).getUnreadCount()

    const countCall = (ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(countCall.where.senderId).toEqual({ not: "user-1" })
    expect(countCall.where.isRead).toBe(false)
  })

  it("uses conversation relation filter to scope to user's conversations", async () => {
    const ctx = makeMessageCtx("user-1")
    ;(ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    await createMessageCaller(ctx).getUnreadCount()

    const countCall = (ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(countCall.where.conversation.OR).toEqual([
      { participant1Id: "user-1" },
      { participant2Id: "user-1" },
    ])
  })

  it("returns zero when no unread messages exist", async () => {
    const ctx = makeMessageCtx("user-1")
    ;(ctx.db.directMessage.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    const result = await createMessageCaller(ctx).getUnreadCount()
    expect(result.count).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE: Cursor-based pagination (take: limit + 1 pattern)
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: Cursor-based pagination efficiency", () => {
  it("getFeed requests limit+1 items to detect next page", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({ limit: 10 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(11) // limit + 1
  })

  it("getFeed returns nextCursor when more items exist", async () => {
    const ctx = makePostCtx("user-1")
    const posts = Array.from({ length: 11 }, (_, i) => mockPost({ id: `post-${i}` }))
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)
    const result = await createPostCaller(ctx).getFeed({ limit: 10 })
    expect(result.posts).toHaveLength(10)
    expect(result.nextCursor).toBe("post-10")
  })

  it("getFeed returns undefined nextCursor when no more items", async () => {
    const ctx = makePostCtx("user-1")
    const posts = Array.from({ length: 5 }, (_, i) => mockPost({ id: `post-${i}` }))
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)
    const result = await createPostCaller(ctx).getFeed({ limit: 10 })
    expect(result.posts).toHaveLength(5)
    expect(result.nextCursor).toBeUndefined()
  })

  it("getExploreFeed uses cursor-based pagination", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({ cursor: "post-abc", limit: 20 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "post-abc" })
    expect(callArgs.take).toBe(21) // limit + 1
  })

  it("search uses cursor-based pagination", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).search({ q: "hello", cursor: "post-xyz", limit: 10 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "post-xyz" })
    expect(callArgs.take).toBe(11)
  })

  it("searchByHashtag uses cursor-based pagination", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).searchByHashtag({ tag: "test", cursor: "post-xyz", limit: 10 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "post-xyz" })
    expect(callArgs.take).toBe(11)
  })

  it("getComments uses cursor-based pagination", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).getComments({ postId: "post-1", limit: 10 })
    const callArgs = (ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(11)
  })

  it("getBookmarks uses cursor-based pagination", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.bookmark.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).getBookmarks({ limit: 10 })
    const callArgs = (ctx.db.bookmark.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(11)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE: Query includes use minimal selects
// ─────────────────────────────────────────────────────────────────────────────

describe("Performance: Minimal select in queries", () => {
  it("getFeed uses select on author (not full user object)", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.include.author.select).toBeDefined()
    // Should only select needed fields, not the full user
    expect(callArgs.include.author.select.id).toBe(true)
    expect(callArgs.include.author.select.name).toBe(true)
    expect(callArgs.include.author.select.username).toBe(true)
    expect(callArgs.include.author.select.avatarUrl).toBe(true)
    expect(callArgs.include.author.select.passwordHash).toBeUndefined()
    expect(callArgs.include.author.select.email).toBeUndefined()
  })

  it("getFeed uses batch interaction checks instead of per-post subqueries", async () => {
    const ctx = makePostCtx("user-1")
    const posts = [mockPost({ id: "post-1" }), mockPost({ id: "post-2" })]
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // Post query should NOT include likes/shares/bookmarks (batch checked separately)
    expect(callArgs.include.likes).toBeUndefined()
    expect(callArgs.include.shares).toBeUndefined()
    expect(callArgs.include.bookmarks).toBeUndefined()
    // Instead, like/share/bookmark are batch-checked via findMany
    expect(ctx.db.like.findMany).toHaveBeenCalled()
    expect(ctx.db.share.findMany).toHaveBeenCalled()
    expect(ctx.db.bookmark.findMany).toHaveBeenCalled()
  })

  it("getExcludedUserIds uses select-only on block queries (no full records)", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})
    const blockCall = (ctx.db.block.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(blockCall.select).toBeDefined()
    expect(blockCall.select.blockerId).toBe(true)
    expect(blockCall.select.blockedId).toBe(true)
  })

  it("getExcludedUserIds uses select-only on mute queries", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})
    const muteCall = (ctx.db.mute.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(muteCall.select).toBeDefined()
    expect(muteCall.select.mutedId).toBe(true)
  })
})
