import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"

// Must be hoisted before imports that use them
vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    createPost: vi.fn().mockResolvedValue(undefined),
    comment: vi.fn().mockResolvedValue(undefined),
    like: vi.fn().mockResolvedValue(undefined),
    follow: vi.fn().mockResolvedValue(undefined),
    showcaseAdd: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(undefined),
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
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(postRouter)

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

function makeCtx(sessionUserId: string | null = "user-1"): Context {
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
    user: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as Context["db"]

  return {
    db,
    redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn().mockResolvedValue("OK"), del: vi.fn().mockResolvedValue(1) } as unknown as Context["redis"],
    session: sessionUserId
      ? {
          user: { id: sessionUserId, name: "Test User", email: "test@example.com" },
          expires: new Date(Date.now() + 3_600_000).toISOString(),
        }
      : null,
  }
}

// ─── getFeed ─────────────────────────────────────────────────────────────────

describe("postRouter.getFeed", () => {
  it("returns empty posts when the user follows nobody", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).getFeed({})
    expect(result.posts).toEqual([])
    expect(result.nextCursor).toBeUndefined()
  })

  it("throws UNAUTHORIZED when there is no session", async () => {
    const ctx = makeCtx(null)
    await expect(createCaller(ctx).getFeed({})).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns paginated posts with nextCursor when more exist", async () => {
    const ctx = makeCtx()
    const posts = Array.from({ length: 21 }, (_, i) => mockPost({ id: `post-${i}` }))
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)

    const result = await createCaller(ctx).getFeed({ limit: 20 })
    expect(result.posts).toHaveLength(20)
    expect(result.nextCursor).toBe("post-20")
  })
})

// ─── create ──────────────────────────────────────────────────────────────────

describe("postRouter.create", () => {
  it("creates a text post and returns it", async () => {
    const ctx = makeCtx()
    const created = mockPost()
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

    const result = await createCaller(ctx).create({ content: "Hello world" })
    expect(result.content).toBe("Hello world")
    expect(result.isLiked).toBe(false)
    expect(result.isShared).toBe(false)
    expect(result.isBookmarked).toBe(false)
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx(null)).create({ content: "Hi" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── delete ──────────────────────────────────────────────────────────────────

describe("postRouter.delete", () => {
  it("throws NOT_FOUND when the post does not exist", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).delete({ id: "ghost" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws FORBIDDEN when deleting another user's post", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "other-user" })
    await expect(createCaller(ctx).delete({ id: "post-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("deletes the post and returns success", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "user-1" })
    ;(ctx.db.post.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})
    const result = await createCaller(ctx).delete({ id: "post-1" })
    expect(result.success).toBe(true)
  })
})

// ─── toggleLike ──────────────────────────────────────────────────────────────

describe("postRouter.toggleLike", () => {
  it("likes a post that has not been liked yet", async () => {
    const ctx = makeCtx()
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })

    const result = await createCaller(ctx).toggleLike({ postId: "post-1" })
    expect(result.liked).toBe(true)
    expect(ctx.db.like.create).toHaveBeenCalled()
  })

  it("unlikes a post that was already liked", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "like-1" })

    const result = await createCaller(ctx).toggleLike({ postId: "post-1" })
    expect(result.liked).toBe(false)
    expect(ctx.db.like.delete).toHaveBeenCalled()
  })
})

// ─── toggleBookmark ───────────────────────────────────────────────────────────

describe("postRouter.toggleBookmark", () => {
  it("bookmarks a post that has not been bookmarked", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1" })
    ;(ctx.db.bookmark.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createCaller(ctx).toggleBookmark({ postId: "post-1" })
    expect(result.bookmarked).toBe(true)
  })

  it("removes a bookmark that already exists", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1" })
    ;(ctx.db.bookmark.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "bm-1" })

    const result = await createCaller(ctx).toggleBookmark({ postId: "post-1" })
    expect(result.bookmarked).toBe(false)
  })
})

// ─── addComment ───────────────────────────────────────────────────────────────

describe("postRouter.addComment", () => {
  it("adds a comment and returns it", async () => {
    const ctx = makeCtx()
    const comment = {
      id: "comment-1",
      content: "Nice post!",
      authorId: "user-1",
      postId: "post-1",
      parentId: null,
      createdAt: new Date(),
      author: { id: "user-1", name: "Test", username: "testuser", avatarUrl: null },
      _count: { likes: 0, replies: 0 },
    }
    ;(ctx.db.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue(comment)
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })

    const result = await createCaller(ctx).addComment({ postId: "post-1", content: "Nice post!" })
    expect(result.content).toBe("Nice post!")
    expect(result.isLiked).toBe(false)
  })

  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(
      createCaller(makeCtx(null)).addComment({ postId: "post-1", content: "Hi" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
