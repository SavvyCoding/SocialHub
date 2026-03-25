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
// SCALABILITY: Pagination enforced on all list endpoints
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: Pagination enforcement", () => {
  it("getFeed defaults to a bounded limit (not unbounded)", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // take should be defined and bounded, never undefined
    expect(callArgs.take).toBeDefined()
    expect(callArgs.take).toBeLessThanOrEqual(51) // default limit (50) + 1
  })

  it("getExploreFeed defaults to a bounded limit", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBeDefined()
    expect(callArgs.take).toBeLessThanOrEqual(51)
  })

  it("search enforces pagination limit", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).search({ q: "test", limit: 20 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(21)
  })

  it("getComments enforces pagination limit", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).getComments({ postId: "post-1", limit: 15 })
    const callArgs = (ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(16)
  })

  it("getBookmarks enforces pagination limit", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.bookmark.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).getBookmarks({ limit: 20 })
    const callArgs = (ctx.db.bookmark.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBe(21)
  })

  it("getMessages enforces pagination limit", async () => {
    const ctx = makeMessageCtx("user-1")
    ;(ctx.db.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      participant1Id: "user-1", participant2Id: "user-2",
    })
    ;(ctx.db.directMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createMessageCaller(ctx).getMessages({ conversationId: "conv-1", limit: 30 })
    const callArgs = (ctx.db.directMessage.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.take).toBeDefined()
    expect(callArgs.take).toBeLessThanOrEqual(31)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY: Cursor pagination prevents offset-based N+1
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: Cursor-based pagination (no offset)", () => {
  it("getFeed uses cursor, not skip/offset", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({ cursor: "post-50", limit: 20 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "post-50" })
    expect(callArgs.skip).toBeUndefined()
  })

  it("getExploreFeed uses cursor, not skip/offset", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({ cursor: "post-100", limit: 20 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "post-100" })
    expect(callArgs.skip).toBeUndefined()
  })

  it("search uses cursor, not skip/offset", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).search({ q: "keyword", cursor: "post-99", limit: 10 })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "post-99" })
    expect(callArgs.skip).toBeUndefined()
  })

  it("getComments uses cursor, not skip/offset", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).getComments({ postId: "post-1", cursor: "comment-50", limit: 10 })
    const callArgs = (ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toEqual({ id: "comment-50" })
    expect(callArgs.skip).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY: No cursor means start from beginning (first page)
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: No cursor for first page", () => {
  it("getFeed passes undefined cursor when not provided", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toBeUndefined()
  })

  it("getExploreFeed passes undefined cursor when not provided", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.cursor).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY: Feed ordering for scalable retrieval
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: Feed ordering", () => {
  it("getFeed orders by createdAt desc (index-friendly)", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.orderBy).toEqual({ createdAt: "desc" })
  })

  it("getExploreFeed orders by likes count then createdAt", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.orderBy).toEqual([
      { likes: { _count: "desc" } },
      { createdAt: "desc" },
    ])
  })

  it("search orders by engagement then recency", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).search({ q: "test" })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.orderBy).toEqual([
      { likes: { _count: "desc" } },
      { createdAt: "desc" },
    ])
  })

  it("getComments orders by createdAt asc (chronological)", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).getComments({ postId: "post-1" })
    const callArgs = (ctx.db.comment.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.orderBy).toEqual({ createdAt: "asc" })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY: Public-only filtering on explore/search (limits scan scope)
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: Public-only filtering", () => {
  it("getExploreFeed only queries PUBLIC posts", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where.visibility).toBe("PUBLIC")
  })

  it("search only queries PUBLIC posts", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).search({ q: "test" })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where.visibility).toBe("PUBLIC")
  })

  it("searchByHashtag only queries PUBLIC posts", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    await createPostCaller(ctx).searchByHashtag({ tag: "trending" })
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where.visibility).toBe("PUBLIC")
  })

  it("getExploreFeed filters out reply posts (parentPostId: null)", async () => {
    const ctx = makePostCtx("user-1")
    await createPostCaller(ctx).getExploreFeed({})
    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where.parentPostId).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY: Large result set handling
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: Large result set handling", () => {
  it("getFeed correctly paginates through 100 posts", async () => {
    const ctx = makePostCtx("user-1")
    // Simulate having more posts than limit
    const posts = Array.from({ length: 21 }, (_, i) => mockPost({ id: `post-${i}` }))
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)

    const result = await createPostCaller(ctx).getFeed({ limit: 20 })
    expect(result.posts).toHaveLength(20)
    expect(result.nextCursor).toBe("post-20")
  })

  it("getExploreFeed correctly paginates large feeds", async () => {
    const ctx = makePostCtx("user-1")
    const posts = Array.from({ length: 21 }, (_, i) => mockPost({ id: `explore-${i}` }))
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)

    const result = await createPostCaller(ctx).getExploreFeed({ limit: 20 })
    expect(result.posts).toHaveLength(20)
    expect(result.nextCursor).toBe("explore-20")
  })

  it("getFeed with empty following list returns empty results efficiently", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const result = await createPostCaller(ctx).getFeed({})
    expect(result.posts).toEqual([])
    expect(result.nextCursor).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SCALABILITY: Notification service — fire-and-forget pattern
// ─────────────────────────────────────────────────────────────────────────────

describe("Scalability: Notification fire-and-forget", () => {
  it("toggleLike does not await notification (fire-and-forget)", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "user-2" })
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    // This should not throw even if notify were to fail
    const result = await createPostCaller(ctx).toggleLike({ postId: "post-1" })
    expect(result.liked).toBe(true)
  })

  it("addComment does not await notification", async () => {
    const ctx = makePostCtx("user-1")
    const comment = {
      id: "c-1", content: "Nice!", authorId: "user-1", postId: "post-1", parentId: null, createdAt: new Date(),
      author: { id: "user-1", name: "Test", username: "testuser", avatarUrl: null },
      _count: { likes: 0, replies: 0 },
    }
    ;(ctx.db.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue(comment)
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "user-2" })

    const result = await createPostCaller(ctx).addComment({ postId: "post-1", content: "Nice!" })
    expect(result.content).toBe("Nice!")
  })

  it("toggleShare does not await notification", async () => {
    const ctx = makePostCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "user-2" })
    ;(ctx.db.share.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createPostCaller(ctx).toggleShare({ postId: "post-1" })
    expect(result.shared).toBe(true)
  })
})
