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
    isPublished: true,
    scheduledAt: null,
    viewCount: 0,
    isPinned: false,
    pinnedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: "user-1", name: "Test", username: "testuser", avatarUrl: null, isVerified: false },
    _count: { likes: 0, comments: 0, shares: 0 },
    poll: null,
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
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
    },
    like: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
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
    pollVote: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    pollOption: {
      update: vi.fn().mockResolvedValue({}),
    },
    mutedKeyword: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
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

  it("creates a post with a poll", async () => {
    const ctx = makeCtx()
    const created = mockPost({
      poll: {
        id: "poll-1",
        question: "Favorite color?",
        options: [
          { id: "opt-1", text: "Red", order: 0, voteCount: 0 },
          { id: "opt-2", text: "Blue", order: 1, voteCount: 0 },
        ],
      },
    })
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

    const result = await createCaller(ctx).create({
      content: "Vote below",
      poll: { question: "Favorite color?", options: ["Red", "Blue"] },
    })
    expect(result.poll?.question).toBe("Favorite color?")
    expect(ctx.db.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          poll: expect.objectContaining({ create: expect.objectContaining({ question: "Favorite color?" }) }),
        }),
      })
    )
  })

  it("creates a scheduled post with isPublished=false", async () => {
    const ctx = makeCtx()
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    const created = mockPost({ isPublished: false, scheduledAt: futureDate })
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

    const result = await createCaller(ctx).create({
      content: "Scheduled post",
      scheduledAt: futureDate,
    })
    expect(result.isPublished).toBe(false)
    expect(ctx.db.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: false }),
      })
    )
  })

  it("creates a non-scheduled post with isPublished=true when scheduledAt is in the past", async () => {
    const ctx = makeCtx()
    const pastDate = new Date(Date.now() - 1000)
    const created = mockPost({ isPublished: true })
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

    const result = await createCaller(ctx).create({
      content: "Past-scheduled post",
      scheduledAt: pastDate,
    })
    expect(result.isPublished).toBe(true)
    expect(ctx.db.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: true }),
      })
    )
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
  it("likes a post with default LIKE reaction", async () => {
    const ctx = makeCtx()
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })

    const result = await createCaller(ctx).toggleLike({ postId: "post-1" })
    expect(result.liked).toBe(true)
    expect(result.reactionType).toBe("LIKE")
    expect(ctx.db.like.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reactionType: "LIKE" }) })
    )
  })

  it("likes a post with LOVE reaction", async () => {
    const ctx = makeCtx()
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })

    const result = await createCaller(ctx).toggleLike({ postId: "post-1", reactionType: "LOVE" })
    expect(result.liked).toBe(true)
    expect(result.reactionType).toBe("LOVE")
    expect(ctx.db.like.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reactionType: "LOVE" }) })
    )
  })

  it("unlikes a post when same reaction type is used again", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ reactionType: "LIKE" })

    const result = await createCaller(ctx).toggleLike({ postId: "post-1", reactionType: "LIKE" })
    expect(result.liked).toBe(false)
    expect(result.reactionType).toBeNull()
    expect(ctx.db.like.delete).toHaveBeenCalled()
  })

  it("changes reaction type when a different emoji is used", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })
    ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ reactionType: "LIKE" })

    const result = await createCaller(ctx).toggleLike({ postId: "post-1", reactionType: "CELEBRATE" })
    expect(result.liked).toBe(true)
    expect(result.reactionType).toBe("CELEBRATE")
    expect(ctx.db.like.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { reactionType: "CELEBRATE" } })
    )
  })

  it("accepts all valid reaction types", async () => {
    for (const reactionType of ["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL", "CURIOUS"] as const) {
      const ctx = makeCtx()
      ;(ctx.db.like.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user" })
      const result = await createCaller(ctx).toggleLike({ postId: "post-1", reactionType })
      expect(result.liked).toBe(true)
      expect(result.reactionType).toBe(reactionType)
    }
  })

  it("rejects an invalid reaction type", async () => {
    const ctx = makeCtx()
    await expect(
      createCaller(ctx).toggleLike({ postId: "post-1", reactionType: "ANGRY" as never })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = makeCtx(null)
    await expect(createCaller(ctx).toggleLike({ postId: "post-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── votePoll ─────────────────────────────────────────────────────────────────

describe("postRouter.votePoll", () => {
  it("casts a vote on a poll option", async () => {
    const ctx = makeCtx()
    ;(ctx.db.pollVote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createCaller(ctx).votePoll({ pollId: "poll-1", optionId: "opt-1" })
    expect(result.success).toBe(true)
    expect(ctx.db.$transaction).toHaveBeenCalled()
  })

  it("throws BAD_REQUEST when user has already voted", async () => {
    const ctx = makeCtx()
    ;(ctx.db.pollVote.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "vote-1" })

    await expect(
      createCaller(ctx).votePoll({ pollId: "poll-1", optionId: "opt-1" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Already voted" })
  })

  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(
      createCaller(makeCtx(null)).votePoll({ pollId: "poll-1", optionId: "opt-1" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── getScheduled ─────────────────────────────────────────────────────────────

describe("postRouter.getScheduled", () => {
  it("returns scheduled posts for the current user", async () => {
    const ctx = makeCtx()
    const future = new Date(Date.now() + 3600_000)
    const scheduledPost = mockPost({ isPublished: false, scheduledAt: future })
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([scheduledPost])

    const result = await createCaller(ctx).getScheduled()
    expect(Array.isArray(result)).toBe(true)
    expect(ctx.db.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorId: "user-1", isPublished: false }),
      })
    )
  })

  it("returns empty array when no scheduled posts exist", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await createCaller(ctx).getScheduled()
    expect(result).toEqual([])
  })

  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).getScheduled()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── togglePin ────────────────────────────────────────────────────────────────

describe("postRouter.togglePin", () => {
  it("pins an unpinned post", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "user-1", isPinned: false })

    const result = await createCaller(ctx).togglePin({ postId: "post-1" })
    expect(result.pinned).toBe(true)
    expect(ctx.db.post.updateMany).toHaveBeenCalled() // unpin existing
    expect(ctx.db.post.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPinned: true }) })
    )
  })

  it("unpins a pinned post", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "user-1", isPinned: true })

    const result = await createCaller(ctx).togglePin({ postId: "post-1" })
    expect(result.pinned).toBe(false)
    expect(ctx.db.post.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isPinned: false, pinnedAt: null } })
    )
  })

  it("throws NOT_FOUND when post does not exist", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(createCaller(ctx).togglePin({ postId: "ghost" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws FORBIDDEN when pinning another user's post", async () => {
    const ctx = makeCtx()
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ authorId: "other-user", isPinned: false })

    await expect(createCaller(ctx).togglePin({ postId: "post-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
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

// ─── createThread ─────────────────────────────────────────────────────────────

describe("postRouter.createThread", () => {
  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(
      createCaller(makeCtx(null)).createThread({
        posts: [{ content: "Part 1" }, { content: "Part 2" }],
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("creates a chain of posts and returns count + rootPostId", async () => {
    const ctx = makeCtx()
    const post1 = mockPost({ id: "thread-1", parentPostId: null })
    const post2 = mockPost({ id: "thread-2", parentPostId: "thread-1" })
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(post1)
      .mockResolvedValueOnce(post2)

    const result = await createCaller(ctx).createThread({
      posts: [{ content: "First post" }, { content: "Second post" }],
    })

    expect(result.count).toBe(2)
    expect(result.rootPostId).toBe("thread-1")
    expect(ctx.db.post.create).toHaveBeenCalledTimes(2)
  })

  it("skips empty parts and only creates non-empty posts", async () => {
    const ctx = makeCtx()
    const post1 = mockPost({ id: "thread-1" })
    const post2 = mockPost({ id: "thread-2" })
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(post1)
      .mockResolvedValueOnce(post2)

    const result = await createCaller(ctx).createThread({
      posts: [{ content: "First" }, { content: "   " }, { content: "Third" }],
    })

    // The blank middle post should be skipped
    expect(result.count).toBe(2)
  })
})

// ─── create (quote post) ──────────────────────────────────────────────────────

describe("postRouter.create with quotedPostId", () => {
  it("sets originalPostId when quotedPostId is provided", async () => {
    const ctx = makeCtx()
    const created = mockPost({ originalPostId: "original-1" })
    ;(ctx.db.post.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

    await createCaller(ctx).create({ content: "Quote comment", quotedPostId: "original-1" })

    expect(ctx.db.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalPostId: "original-1" }),
      })
    )
  })
})

// ─── getFeed muted keywords ───────────────────────────────────────────────────

describe("postRouter.getFeed muted keyword filtering", () => {
  it("passes muted keywords filter when user has muted words", async () => {
    const ctx = makeCtx()
    ;(ctx.db.mutedKeyword.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { keyword: "spam" },
    ])

    await createCaller(ctx).getFeed({})

    expect(ctx.db.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ content: expect.objectContaining({ contains: "spam" }) }),
            ]),
          }),
        }),
      })
    )
  })

  it("does not add keyword filter when user has no muted keywords", async () => {
    const ctx = makeCtx()
    ;(ctx.db.mutedKeyword.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    await createCaller(ctx).getFeed({})

    const callArgs = (ctx.db.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where).not.toHaveProperty("NOT")
  })
})
