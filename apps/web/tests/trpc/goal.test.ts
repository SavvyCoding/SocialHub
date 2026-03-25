import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {
    createPost: vi.fn().mockResolvedValue(undefined),
    comment: vi.fn().mockResolvedValue(undefined),
    like: vi.fn().mockResolvedValue(undefined),
    follow: vi.fn().mockResolvedValue(undefined),
    showcaseAdd: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(undefined),
  },
  rateLimit: vi.fn().mockResolvedValue(1),
}))

import { goalRouter } from "@/server/trpc/router/goal"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(goalRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    goal: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
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

// ─── getGoals ────────────────────────────────────────────────────────────────

describe("goalRouter.getGoals", () => {
  it("returns goals for a user (public)", async () => {
    const ctx = makeCtx(null)
    const result = await createCaller(ctx).getGoals({ userId: "user-1" })
    expect(result.entries).toEqual([])
  })

  it("filters by category", async () => {
    const ctx = makeCtx(null)
    await createCaller(ctx).getGoals({ userId: "user-1", category: "Travel" })
    expect(ctx.db.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: "Travel" }) })
    )
  })

  it("filters by completion status", async () => {
    const ctx = makeCtx(null)
    await createCaller(ctx).getGoals({ userId: "user-1", completed: true })
    expect(ctx.db.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isCompleted: true }) })
    )
  })
})

// ─── addGoal ─────────────────────────────────────────────────────────────────

describe("goalRouter.addGoal", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).addGoal({ title: "Run a marathon" })).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("creates a goal", async () => {
    const ctx = makeCtx()
    const created = { id: "goal-1", title: "Run a marathon", userId: "user-1" }
    ;(ctx.db.goal.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)
    const result = await createCaller(ctx).addGoal({ title: "Run a marathon" })
    expect(result.id).toBe("goal-1")
  })
})

// ─── toggleComplete ──────────────────────────────────────────────────────────

describe("goalRouter.toggleComplete", () => {
  it("throws FORBIDDEN when goal not found", async () => {
    await expect(createCaller(makeCtx()).toggleComplete({ id: "bad" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("throws FORBIDDEN when not the owner", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.goal.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", userId: "user-2", isCompleted: false })
    await expect(createCaller(ctx).toggleComplete({ id: "g-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("toggles completion from false to true", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.goal.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", userId: "user-1", isCompleted: false })
    ;(ctx.db.goal.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", isCompleted: true })
    const result = await createCaller(ctx).toggleComplete({ id: "g-1" })
    expect(result.isCompleted).toBe(true)
  })

  it("toggles completion from true to false", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.goal.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", userId: "user-1", isCompleted: true })
    ;(ctx.db.goal.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", isCompleted: false })
    const result = await createCaller(ctx).toggleComplete({ id: "g-1" })
    expect(result.isCompleted).toBe(false)
  })
})

// ─── deleteGoal ──────────────────────────────────────────────────────────────

describe("goalRouter.deleteGoal", () => {
  it("throws FORBIDDEN when not the owner", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.goal.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", userId: "user-2" })
    await expect(createCaller(ctx).deleteGoal({ id: "g-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("deletes own goal", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.goal.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1", userId: "user-1" })
    ;(ctx.db.goal.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "g-1" })
    const result = await createCaller(ctx).deleteGoal({ id: "g-1" })
    expect(result.id).toBe("g-1")
  })
})

// ─── getStats ────────────────────────────────────────────────────────────────

describe("goalRouter.getStats", () => {
  it("returns stats for a user", async () => {
    const ctx = makeCtx(null)
    ;(ctx.db.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { isCompleted: true, category: "Travel" },
      { isCompleted: false, category: "Travel" },
      { isCompleted: true, category: "Health & Fitness" },
    ])
    const result = await createCaller(ctx).getStats({ userId: "user-1" })
    expect(result.total).toBe(3)
    expect(result.completed).toBe(2)
    expect(result.pending).toBe(1)
    expect(result.categories).toHaveLength(2)
  })
})

// ─── getCategories ───────────────────────────────────────────────────────────

describe("goalRouter.getCategories", () => {
  it("returns the list of categories", async () => {
    const result = await createCaller(makeCtx(null)).getCategories()
    expect(result).toContain("Travel")
    expect(result).toContain("Health & Fitness")
    expect(result.length).toBeGreaterThan(0)
  })
})
