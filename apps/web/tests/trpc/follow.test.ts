import { describe, it, expect, vi } from "vitest"

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

import { followRouter } from "@/server/trpc/router/follow"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(followRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    follow: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    friendRequest: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn().mockResolvedValue("OK"), del: vi.fn().mockResolvedValue(1) } as unknown as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── follow ──────────────────────────────────────────────────────────────────

describe("followRouter.follow", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).follow({ userId: "user-2" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("throws BAD_REQUEST when trying to follow yourself", async () => {
    await expect(createCaller(makeCtx("user-1")).follow({ userId: "user-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("returns following:true when already following", async () => {
    const ctx = makeCtx()
    ;(ctx.db.follow.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "follow-1" })
    const result = await createCaller(ctx).follow({ userId: "user-2" })
    expect(result.following).toBe(true)
    expect(ctx.db.follow.create).not.toHaveBeenCalled()
  })

  it("creates a follow and returns following:true", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).follow({ userId: "user-2" })
    expect(result.following).toBe(true)
    expect(ctx.db.follow.create).toHaveBeenCalled()
  })
})

// ─── unfollow ────────────────────────────────────────────────────────────────

describe("followRouter.unfollow", () => {
  it("deletes the follow and returns following:false", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).unfollow({ userId: "user-2" })
    expect(result.following).toBe(false)
    expect(ctx.db.follow.deleteMany).toHaveBeenCalled()
  })
})

// ─── isFollowing ─────────────────────────────────────────────────────────────

describe("followRouter.isFollowing", () => {
  it("returns following:false when not following", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).isFollowing({ userId: "user-2" })
    expect(result.following).toBe(false)
  })

  it("returns following:true when following", async () => {
    const ctx = makeCtx()
    ;(ctx.db.follow.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "follow-1" })
    const result = await createCaller(ctx).isFollowing({ userId: "user-2" })
    expect(result.following).toBe(true)
  })
})

// ─── getFollowers ────────────────────────────────────────────────────────────

describe("followRouter.getFollowers", () => {
  it("returns an empty list when no followers", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).getFollowers({ userId: "user-1" })
    expect(result.followers).toEqual([])
    expect(result.nextCursor).toBeUndefined()
  })

  it("paginates with nextCursor", async () => {
    const ctx = makeCtx()
    const follows = Array.from({ length: 21 }, (_, i) => ({
      id: `follow-${i}`,
      follower: { id: `u-${i}`, name: `User ${i}`, username: `user${i}`, avatarUrl: null, bio: null, isVerified: false },
    }))
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(follows)
    const result = await createCaller(ctx).getFollowers({ userId: "user-1", limit: 20 })
    expect(result.followers).toHaveLength(20)
    expect(result.nextCursor).toBe("follow-20")
  })
})

// ─── getFollowing ────────────────────────────────────────────────────────────

describe("followRouter.getFollowing", () => {
  it("returns an empty list when not following anyone", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).getFollowing({ userId: "user-1" })
    expect(result.following).toEqual([])
  })
})

// ─── sendFriendRequest ───────────────────────────────────────────────────────

describe("followRouter.sendFriendRequest", () => {
  it("throws BAD_REQUEST when sending to yourself", async () => {
    await expect(createCaller(makeCtx("user-1")).sendFriendRequest({ userId: "user-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("returns existing request if one already exists", async () => {
    const ctx = makeCtx()
    const existing = { id: "fr-1", requesterId: "user-1", requesteeId: "user-2", status: "PENDING" }
    ;(ctx.db.friendRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing)
    const result = await createCaller(ctx).sendFriendRequest({ userId: "user-2" })
    expect(result.id).toBe("fr-1")
    expect(ctx.db.friendRequest.create).not.toHaveBeenCalled()
  })

  it("creates a new friend request", async () => {
    const ctx = makeCtx()
    const created = { id: "fr-new", requesterId: "user-1", requesteeId: "user-2", status: "PENDING" }
    ;(ctx.db.friendRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)
    const result = await createCaller(ctx).sendFriendRequest({ userId: "user-2" })
    expect(result.id).toBe("fr-new")
  })
})

// ─── respondFriendRequest ────────────────────────────────────────────────────

describe("followRouter.respondFriendRequest", () => {
  it("throws NOT_FOUND for invalid request", async () => {
    const ctx = makeCtx()
    await expect(createCaller(ctx).respondFriendRequest({ requestId: "bad", accept: true })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws NOT_FOUND when user is not the requestee", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.friendRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", requesterId: "user-2", requesteeId: "user-3", status: "PENDING",
    })
    await expect(createCaller(ctx).respondFriendRequest({ requestId: "fr-1", accept: true })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("accepts a friend request and auto-follows", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.friendRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", requesterId: "user-2", requesteeId: "user-1", status: "PENDING",
    })
    ;(ctx.db.friendRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "fr-1", status: "ACCEPTED" })
    const result = await createCaller(ctx).respondFriendRequest({ requestId: "fr-1", accept: true })
    expect(result.status).toBe("ACCEPTED")
    expect(ctx.db.follow.createMany).toHaveBeenCalled()
  })

  it("rejects a friend request without auto-following", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.friendRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "fr-1", requesterId: "user-2", requesteeId: "user-1", status: "PENDING",
    })
    ;(ctx.db.friendRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "fr-1", status: "REJECTED" })
    const result = await createCaller(ctx).respondFriendRequest({ requestId: "fr-1", accept: false })
    expect(result.status).toBe("REJECTED")
    expect(ctx.db.follow.createMany).not.toHaveBeenCalled()
  })
})

// ─── Phase 2: Mutual Followers ────────────────────────────────────────────────

describe("followRouter.getMutualFollowers", () => {
  it("returns users both parties follow in common", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2" })
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ followingId: "user-3" }, { followingId: "user-4" }]) // viewer follows
      .mockResolvedValueOnce([{ followingId: "user-3" }, { followingId: "user-5" }]) // target follows
    ;(ctx.db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-3", name: "Charlie", username: "charlie", avatarUrl: null, isVerified: false },
    ])

    const result = await createCaller(ctx).getMutualFollowers({ username: "target" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("user-3")
  })

  it("returns empty when no mutual follows", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2" })
    ;(ctx.db.follow.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ followingId: "user-3" }])
      .mockResolvedValueOnce([{ followingId: "user-5" }])

    const result = await createCaller(ctx).getMutualFollowers({ username: "target" })
    expect(result).toHaveLength(0)
    expect(ctx.db.user.findMany).not.toHaveBeenCalled()
  })

  it("throws NOT_FOUND when target user does not exist", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).getMutualFollowers({ username: "ghost" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx(null)).getMutualFollowers({ username: "alice" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
