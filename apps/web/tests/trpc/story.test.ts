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

import { storyRouter } from "@/server/trpc/router/story"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(storyRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    follow: { findMany: vi.fn().mockResolvedValue([]) },
    story: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    storyView: {
      upsert: vi.fn().mockResolvedValue({}),
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

// ─── getActiveForFeed ────────────────────────────────────────────────────────

describe("storyRouter.getActiveForFeed", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).getActiveForFeed()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns empty when no active stories", async () => {
    const result = await createCaller(makeCtx()).getActiveForFeed()
    expect(result).toEqual([])
  })

  it("groups stories by author", async () => {
    const ctx = makeCtx()
    ;(ctx.db.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s-1", authorId: "user-1", author: { id: "user-1", name: "Me", username: "me", avatarUrl: null, isVerified: false }, views: [], createdAt: new Date() },
      { id: "s-2", authorId: "user-1", author: { id: "user-1", name: "Me", username: "me", avatarUrl: null, isVerified: false }, views: [{ id: "v-1" }], createdAt: new Date() },
    ])
    const result = await createCaller(ctx).getActiveForFeed()
    expect(result).toHaveLength(1)
    expect(result[0].stories).toHaveLength(2)
    expect(result[0].hasUnseen).toBe(true)
    expect(result[0].stories[1].isSeen).toBe(true)
  })
})

// ─── create ──────────────────────────────────────────────────────────────────

describe("storyRouter.create", () => {
  it("creates a story", async () => {
    const ctx = makeCtx()
    const created = {
      id: "s-1",
      authorId: "user-1",
      mediaUrl: "https://example.com/img.jpg",
      mediaType: "IMAGE",
      author: { id: "user-1", name: "Me", username: "me", avatarUrl: null },
    }
    ;(ctx.db.story.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)
    const result = await createCaller(ctx).create({ mediaUrl: "https://example.com/img.jpg", mediaType: "IMAGE" })
    expect(result.id).toBe("s-1")
  })
})

// ─── delete ──────────────────────────────────────────────────────────────────

describe("storyRouter.delete", () => {
  it("throws NOT_FOUND when story doesn't exist", async () => {
    await expect(createCaller(makeCtx()).delete({ id: "bad" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws NOT_FOUND when not the author", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s-1", authorId: "user-2" })
    await expect(createCaller(ctx).delete({ id: "s-1" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("deletes own story", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s-1", authorId: "user-1" })
    const result = await createCaller(ctx).delete({ id: "s-1" })
    expect(result.success).toBe(true)
  })
})

// ─── markViewed ──────────────────────────────────────────────────────────────

describe("storyRouter.markViewed", () => {
  it("upserts a story view", async () => {
    const ctx = makeCtx()
    ;(ctx.db.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s-1" })
    const result = await createCaller(ctx).markViewed({ storyId: "s-1" })
    expect(result.success).toBe(true)
    expect(ctx.db.storyView.upsert).toHaveBeenCalled()
  })
})

// ─── getViewers ──────────────────────────────────────────────────────────────

describe("storyRouter.getViewers", () => {
  it("throws FORBIDDEN when not the author", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s-1", authorId: "user-2" })
    await expect(createCaller(ctx).getViewers({ storyId: "s-1" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("returns viewers for own story", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s-1", authorId: "user-1" })
    ;(ctx.db.storyView.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "v-1", storyId: "s-1", viewerId: "user-2" }])
    const result = await createCaller(ctx).getViewers({ storyId: "s-1" })
    expect(result).toHaveLength(1)
  })
})
