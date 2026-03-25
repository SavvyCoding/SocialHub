import { describe, it, expect, vi } from "vitest"

import { notificationRouter } from "@/server/trpc/router/notification"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(notificationRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
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

// ─── getAll ──────────────────────────────────────────────────────────────────

describe("notificationRouter.getAll", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).getAll({})).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns empty notifications list", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).getAll({})
    expect(result.notifications).toEqual([])
    expect(result.nextCursor).toBeUndefined()
  })

  it("maps actors to notifications", async () => {
    const ctx = makeCtx()
    const notifications = [
      { id: "n-1", recipientId: "user-1", actorId: "user-2", type: "LIKE_POST", isRead: false, createdAt: new Date(), recipient: {} },
    ]
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(notifications)
    ;(ctx.db.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-2", name: "Alice", username: "alice", avatarUrl: null, isVerified: false },
    ])
    const result = await createCaller(ctx).getAll({})
    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0].actor?.username).toBe("alice")
  })

  it("handles notifications without actorId", async () => {
    const ctx = makeCtx()
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "n-1", recipientId: "user-1", actorId: null, type: "SYSTEM", isRead: false, createdAt: new Date(), recipient: {} },
    ])
    const result = await createCaller(ctx).getAll({})
    expect(result.notifications[0].actor).toBeNull()
  })

  it("paginates with nextCursor", async () => {
    const ctx = makeCtx()
    const notifications = Array.from({ length: 21 }, (_, i) => ({
      id: `n-${i}`, recipientId: "user-1", actorId: null, type: "SYSTEM", isRead: false, createdAt: new Date(), recipient: {},
    }))
    ;(ctx.db.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(notifications)
    const result = await createCaller(ctx).getAll({ limit: 20 })
    expect(result.notifications).toHaveLength(20)
    expect(result.nextCursor).toBe("n-20")
  })
})

// ─── getCount ────────────────────────────────────────────────────────────────

describe("notificationRouter.getCount", () => {
  it("returns unread count", async () => {
    const ctx = makeCtx()
    ;(ctx.db.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(5)
    const result = await createCaller(ctx).getCount()
    expect(result.count).toBe(5)
  })
})

// ─── markRead ────────────────────────────────────────────────────────────────

describe("notificationRouter.markRead", () => {
  it("marks a single notification as read", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).markRead({ id: "n-1" })
    expect(result.success).toBe(true)
    expect(ctx.db.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "n-1" }) })
    )
  })

  it("marks all notifications as read when no id provided", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).markRead({})
    expect(result.success).toBe(true)
    expect(ctx.db.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isRead: false }) })
    )
  })
})
