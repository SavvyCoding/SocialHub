import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"

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

vi.mock("@/server/services/social-graph.service", () => ({
  authorSelect: { id: true, name: true, username: true, avatarUrl: true, isVerified: true },
  countSelect: { likes: true, comments: true, shares: true },
  getFollowingIds: vi.fn().mockResolvedValue([]),
  getExcludedUserIds: vi.fn().mockResolvedValue([]),
  batchGetInteractions: vi.fn().mockResolvedValue(new Map()),
}))

import { collectionRouter } from "@/server/trpc/router/collection"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(collectionRouter)

function makeCollection(overrides = {}) {
  return {
    id: "col-1",
    userId: "user-1",
    name: "My Reads",
    description: null,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    collection: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(makeCollection()),
      update: vi.fn().mockResolvedValue(makeCollection()),
      delete: vi.fn().mockResolvedValue(makeCollection()),
    },
    collectionItem: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: "ci-1", collectionId: "col-1", postId: "post-1" }),
      delete: vi.fn().mockResolvedValue({ id: "ci-1" }),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn(), del: vi.fn() } as unknown as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, username: "testuser", name: "Test User", email: "test@example.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── list ─────────────────────────────────────────────────────────────────────

describe("collectionRouter.list", () => {
  it("returns public collections for a visitor", async () => {
    const ctx = makeCtx(null)
    ;(ctx.db.collection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...makeCollection(), _count: { items: 3 }, items: [] },
    ])
    const result = await createCaller(ctx).list({ userId: "user-1" })
    expect(Array.isArray(result)).toBe(true)
    // Visitor: should only query public
    const call = (ctx.db.collection.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where.isPublic).toBe(true)
  })

  it("returns all collections (including private) for the owner", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.collection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...makeCollection(), _count: { items: 0 }, items: [] },
    ])
    await createCaller(ctx).list({ userId: "user-1" })
    const call = (ctx.db.collection.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where.isPublic).toBeUndefined()
  })
})

// ─── create ───────────────────────────────────────────────────────────────────

describe("collectionRouter.create", () => {
  it("creates a collection for an authenticated user", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).create({ name: "Tech Posts", isPublic: true })
    expect(ctx.db.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", name: "Tech Posts" }) })
    )
    expect(result.name).toBe("My Reads") // mock returns default
  })

  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = makeCtx(null)
    await expect(createCaller(ctx).create({ name: "Hidden", isPublic: false })).rejects.toThrow(TRPCError)
  })

  it("rejects a name longer than 100 characters", async () => {
    const ctx = makeCtx()
    await expect(createCaller(ctx).create({ name: "a".repeat(101), isPublic: true })).rejects.toThrow()
  })

  it("rejects a description longer than 300 characters", async () => {
    const ctx = makeCtx()
    await expect(createCaller(ctx).create({ name: "Valid", description: "a".repeat(301), isPublic: true })).rejects.toThrow()
  })
})

// ─── update ───────────────────────────────────────────────────────────────────

describe("collectionRouter.update", () => {
  it("allows the owner to update their collection", async () => {
    const ctx = makeCtx()
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    const result = await createCaller(ctx).update({ id: "col-1", name: "Renamed" })
    expect(ctx.db.collection.update).toHaveBeenCalled()
    expect(result).toBeDefined()
  })

  it("throws FORBIDDEN when a non-owner tries to update", async () => {
    const ctx = makeCtx("other-user")
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await expect(createCaller(ctx).update({ id: "col-1", name: "Hack" })).rejects.toThrow(TRPCError)
  })

  it("throws FORBIDDEN when collection does not exist", async () => {
    const ctx = makeCtx()
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).update({ id: "nonexistent", name: "Name" })).rejects.toThrow(TRPCError)
  })
})

// ─── delete ───────────────────────────────────────────────────────────────────

describe("collectionRouter.delete", () => {
  it("allows the owner to delete their collection", async () => {
    const ctx = makeCtx()
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await createCaller(ctx).delete({ id: "col-1" })
    expect(ctx.db.collection.delete).toHaveBeenCalledWith({ where: { id: "col-1" } })
  })

  it("throws FORBIDDEN when a non-owner tries to delete", async () => {
    const ctx = makeCtx("other-user")
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await expect(createCaller(ctx).delete({ id: "col-1" })).rejects.toThrow(TRPCError)
  })
})

// ─── addPost / removePost ──────────────────────────────────────────────────────

describe("collectionRouter.addPost", () => {
  it("adds a post to a collection the user owns", async () => {
    const ctx = makeCtx()
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await createCaller(ctx).addPost({ collectionId: "col-1", postId: "post-1" })
    expect(ctx.db.collectionItem.upsert).toHaveBeenCalled()
  })

  it("throws FORBIDDEN when adding to another user's collection", async () => {
    const ctx = makeCtx("other-user")
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await expect(createCaller(ctx).addPost({ collectionId: "col-1", postId: "post-1" })).rejects.toThrow(TRPCError)
  })
})

describe("collectionRouter.removePost", () => {
  it("removes a post from a collection the user owns", async () => {
    const ctx = makeCtx()
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await createCaller(ctx).removePost({ collectionId: "col-1", postId: "post-1" })
    expect(ctx.db.collectionItem.delete).toHaveBeenCalled()
  })

  it("throws FORBIDDEN when removing from another user's collection", async () => {
    const ctx = makeCtx("other-user")
    ;(ctx.db.collection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeCollection({ userId: "user-1" }))
    await expect(createCaller(ctx).removePost({ collectionId: "col-1", postId: "post-1" })).rejects.toThrow(TRPCError)
  })
})

// ─── myCollections ────────────────────────────────────────────────────────────

describe("collectionRouter.myCollections", () => {
  it("returns the user's own collections", async () => {
    const ctx = makeCtx()
    ;(ctx.db.collection.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "col-1", name: "Favorites" },
    ])
    const result = await createCaller(ctx).myCollections()
    expect(result).toEqual([{ id: "col-1", name: "Favorites" }])
  })

  it("throws UNAUTHORIZED when not logged in", async () => {
    const ctx = makeCtx(null)
    await expect(createCaller(ctx).myCollections()).rejects.toThrow(TRPCError)
  })
})
