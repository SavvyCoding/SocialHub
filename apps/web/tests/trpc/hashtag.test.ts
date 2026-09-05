import { describe, it, expect, vi } from "vitest"

import { hashtagRouter } from "@/server/trpc/router/hashtag"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(hashtagRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    postHashtag: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    hashtag: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Context["db"]

  return {
    db,
    redis: {} as Context["redis"],
    session: sessionUserId
      ? { user: { id: sessionUserId, username: "testuser", name: "Test", email: "t@e.com" }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null,
  }
}

// ─── getTrending ─────────────────────────────────────────────────────────────

describe("hashtagRouter.getTrending", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    await expect(createCaller(makeCtx(null)).getTrending({})).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("returns empty array when no trending hashtags", async () => {
    const result = await createCaller(makeCtx()).getTrending({})
    expect(result).toEqual([])
  })

  it("returns trending hashtags with counts", async () => {
    const ctx = makeCtx()
    ;(ctx.db.postHashtag.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { hashtagId: "h-1", _count: { hashtagId: 10 } },
      { hashtagId: "h-2", _count: { hashtagId: 5 } },
    ])
    ;(ctx.db.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "h-1", name: "react" },
      { id: "h-2", name: "nextjs" },
    ])
    const result = await createCaller(ctx).getTrending({ limit: 10 })
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: "react", count: 10 })
    expect(result[1]).toEqual({ name: "nextjs", count: 5 })
  })

  it("filters out hashtags with missing names", async () => {
    const ctx = makeCtx()
    ;(ctx.db.postHashtag.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { hashtagId: "h-1", _count: { hashtagId: 10 } },
      { hashtagId: "h-deleted", _count: { hashtagId: 3 } },
    ])
    ;(ctx.db.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "h-1", name: "react" },
    ])
    const result = await createCaller(ctx).getTrending({ limit: 10 })
    expect(result).toHaveLength(1)
  })
})

// ─── search ──────────────────────────────────────────────────────────────────

describe("hashtagRouter.search", () => {
  it("returns matching hashtags with counts", async () => {
    const ctx = makeCtx()
    ;(ctx.db.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "react", _count: { posts: 15 } },
      { name: "reactnative", _count: { posts: 3 } },
    ])
    const result = await createCaller(ctx).search({ q: "react" })
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: "react", count: 15 })
  })

  it("returns empty for no matches", async () => {
    const result = await createCaller(makeCtx()).search({ q: "nonexistent" })
    expect(result).toEqual([])
  })
})
