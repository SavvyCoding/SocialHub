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

import { reportRouter } from "@/server/trpc/router/report"
import { createCallerFactory } from "@/server/trpc/trpc"
import type { Context } from "@/server/trpc/context"

const createCaller = createCallerFactory(reportRouter)

function makeCtx(sessionUserId: string | null = "user-1"): Context {
  const db = {
    post: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    postReport: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "report-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
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

// ─── reportPost ───────────────────────────────────────────────────────────────

describe("reportRouter.reportPost", () => {
  it("creates a report for another user's post", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "user-2" })

    const result = await createCaller(ctx).reportPost({ postId: "post-1", reason: "SPAM" })
    expect(result.success).toBe(true)
    expect(ctx.db.postReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reporterId: "user-1", postId: "post-1", reason: "SPAM" }) })
    )
  })

  it("throws BAD_REQUEST when reporting own post", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "user-1" })
    await expect(createCaller(ctx).reportPost({ postId: "post-1", reason: "SPAM" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("throws NOT_FOUND when post does not exist", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).reportPost({ postId: "ghost", reason: "SPAM" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("throws CONFLICT when post already reported by same user", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "user-2" })
    ;(ctx.db.postReport.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "report-1" })
    await expect(createCaller(ctx).reportPost({ postId: "post-1", reason: "SPAM" }))
      .rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("throws UNAUTHORIZED when unauthenticated", async () => {
    await expect(createCaller(makeCtx(null)).reportPost({ postId: "p1", reason: "SPAM" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})

// ─── getMyReports ─────────────────────────────────────────────────────────────

describe("reportRouter.getMyReports", () => {
  it("returns the current user's submitted reports", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.postReport.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "r1", postId: "post-1", reason: "SPAM", status: "PENDING", createdAt: new Date() },
    ])
    const result = await createCaller(ctx).getMyReports()
    expect(result).toHaveLength(1)
    const callArgs = (ctx.db.postReport.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.where).toMatchObject({ reporterId: "user-1" })
  })
})

// ─── getModerationQueue ───────────────────────────────────────────────────────

describe("reportRouter.getModerationQueue", () => {
  it("returns all pending reports", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.postReport.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "r1", postId: "p1", reporterId: "u2", reason: "SPAM", status: "PENDING", createdAt: new Date() },
    ])
    const result = await createCaller(ctx).getModerationQueue({ status: "PENDING" })
    expect(result.reports).toHaveLength(1)
  })

  it("paginates when more reports exist than limit", async () => {
    const ctx = makeCtx("user-1")
    const reports = Array.from({ length: 6 }, (_, i) => ({
      id: `r-${i}`, postId: "p1", reporterId: "u2", reason: "SPAM", status: "PENDING", details: null, createdAt: new Date(),
    }))
    ;(ctx.db.postReport.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(reports)
    const result = await createCaller(ctx).getModerationQueue({ limit: 5 })
    expect(result.reports).toHaveLength(5)
    expect(result.nextCursor).toBe("r-5")
  })
})

// ─── updateReportStatus ───────────────────────────────────────────────────────

describe("reportRouter.updateReportStatus", () => {
  it("updates report status to DISMISSED", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.postReport.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "r1" })
    const result = await createCaller(ctx).updateReportStatus({ reportId: "r1", status: "DISMISSED" })
    expect(result.success).toBe(true)
    expect(ctx.db.postReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "DISMISSED" } })
    )
  })

  it("throws NOT_FOUND when report does not exist", async () => {
    const ctx = makeCtx("user-1")
    ;(ctx.db.postReport.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(createCaller(ctx).updateReportStatus({ reportId: "ghost", status: "REVIEWED" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
