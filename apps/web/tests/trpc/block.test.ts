import { describe, it, expect, vi } from "vitest"

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

import { blockRouter } from "@/server/trpc/router/block"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(blockRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    block: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    mute: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    follow: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: { get: vi.fn().mockResolvedValue(null), setex: vi.fn().mockResolvedValue("OK"), del: vi.fn().mockResolvedValue(1) } as unknown as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, username: "testuser", name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── block ───────────────────────────────────────────────────────────────────

describe("blockRouter.block", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).block({ userId: "user-2" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("throws BAD_REQUEST when blocking yourself", async () => {
    await expect(createCaller(makeCtx("user-1")).block({ userId: "user-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("blocks a user and removes mutual follows", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).block({ userId: "user-2" })
    expect(result.isBlocked).toBe(true)
    expect(ctx.db.block.upsert).toHaveBeenCalled()
    expect(ctx.db.follow.deleteMany).toHaveBeenCalled()
  })
})

// ─── unblock ─────────────────────────────────────────────────────────────────

describe("blockRouter.unblock", () => {
  it("unblocks a user", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).unblock({ userId: "user-2" })
    expect(result.isBlocked).toBe(false)
    expect(ctx.db.block.deleteMany).toHaveBeenCalled()
  })
})

// ─── mute ────────────────────────────────────────────────────────────────────

describe("blockRouter.mute", () => {
  it("throws BAD_REQUEST when muting yourself", async () => {
    await expect(createCaller(makeCtx("user-1")).mute({ userId: "user-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("mutes a user", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).mute({ userId: "user-2" })
    expect(result.isMuted).toBe(true)
    expect(ctx.db.mute.upsert).toHaveBeenCalled()
  })
})

// ─── unmute ──────────────────────────────────────────────────────────────────

describe("blockRouter.unmute", () => {
  it("unmutes a user", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).unmute({ userId: "user-2" })
    expect(result.isMuted).toBe(false)
    expect(ctx.db.mute.deleteMany).toHaveBeenCalled()
  })
})

// ─── getStatus ───────────────────────────────────────────────────────────────

describe("blockRouter.getStatus", () => {
  it("returns all-false when no block/mute exists", async () => {
    const ctx = makeCtx()
    const result = await createCaller(ctx).getStatus({ userId: "user-2" })
    expect(result).toEqual({ isBlocked: false, isMuted: false, isBlockedByThem: false })
  })

  it("returns isBlocked:true when user is blocked", async () => {
    const ctx = makeCtx()
    ;(ctx.db.block.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "block-1" }) // I blocked them
      .mockResolvedValueOnce(null) // They didn't block me
    ;(ctx.db.mute.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const result = await createCaller(ctx).getStatus({ userId: "user-2" })
    expect(result.isBlocked).toBe(true)
    expect(result.isBlockedByThem).toBe(false)
  })

  it("returns isBlockedByThem:true when they blocked me", async () => {
    const ctx = makeCtx()
    ;(ctx.db.block.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null) // I didn't block them
      .mockResolvedValueOnce({ id: "block-2" }) // They blocked me
    ;(ctx.db.mute.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const result = await createCaller(ctx).getStatus({ userId: "user-2" })
    expect(result.isBlocked).toBe(false)
    expect(result.isBlockedByThem).toBe(true)
  })
})

// ─── getBlocked ──────────────────────────────────────────────────────────────

describe("blockRouter.getBlocked", () => {
  it("returns list of blocked users", async () => {
    const ctx = makeCtx()
    ;(ctx.db.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { blocked: { id: "u-2", name: "User2", username: "user2", avatarUrl: null } },
    ])
    const result = await createCaller(ctx).getBlocked()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("u-2")
  })
})

// ─── getMuted ────────────────────────────────────────────────────────────────

describe("blockRouter.getMuted", () => {
  it("returns list of muted users", async () => {
    const ctx = makeCtx()
    ;(ctx.db.mute.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { muted: { id: "u-3", name: "User3", username: "user3", avatarUrl: null } },
    ])
    const result = await createCaller(ctx).getMuted()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("u-3")
  })
})
