import { describe, it, expect, vi } from "vitest"

import { closeFriendRouter } from "@/server/trpc/router/closefriend"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(closeFriendRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    closeFriend: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: {} as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── addCloseFriend ───────────────────────────────────────────────────────────

describe("closeFriendRouter.addCloseFriend", () => {
  it("adds a user as a close friend", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2" })
    const result = await createCaller(ctx).addCloseFriend({ friendId: "user-2" })
    expect(result.added).toBe(true)
    expect(ctx.db.closeFriend.upsert).toHaveBeenCalled()
  })

  it("throws BAD_REQUEST when adding self", async () => {
    const ctx = makeCtx("user-1")
    await expect(createCaller(ctx).addCloseFriend({ friendId: "user-1" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("throws NOT_FOUND when target user does not exist", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).addCloseFriend({ friendId: "ghost" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx(null)).addCloseFriend({ friendId: "user-2" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── removeCloseFriend ────────────────────────────────────────────────────────

describe("closeFriendRouter.removeCloseFriend", () => {
  it("removes an existing close friend", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.closeFriend.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-1", friendId: "user-2" })
    const result = await createCaller(ctx).removeCloseFriend({ friendId: "user-2" })
    expect(result.removed).toBe(true)
    expect(ctx.db.closeFriend.delete).toHaveBeenCalled()
  })

  it("throws NOT_FOUND when relationship does not exist", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.closeFriend.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).removeCloseFriend({ friendId: "user-2" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})

// ─── getMyCloseFriends ────────────────────────────────────────────────────────

describe("closeFriendRouter.getMyCloseFriends", () => {
  it("returns the user's close friends list", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.closeFriend.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { friend: { id: "user-2", name: "Bob", username: "bob", avatarUrl: null, isVerified: false } },
    ])
    const result = await createCaller(ctx).getMyCloseFriends()
    expect(result).toHaveLength(1)
    expect(result[0].username).toBe("bob")
  })
})

// ─── isCloseFriend ────────────────────────────────────────────────────────────

describe("closeFriendRouter.isCloseFriend", () => {
  it("returns true when user is a close friend", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.closeFriend.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: "user-1", friendId: "user-2" })
    const result = await createCaller(ctx).isCloseFriend({ friendId: "user-2" })
    expect(result.isCloseFriend).toBe(true)
  })

  it("returns false when user is not a close friend", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.closeFriend.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const result = await createCaller(ctx).isCloseFriend({ friendId: "user-2" })
    expect(result.isCloseFriend).toBe(false)
  })
})
