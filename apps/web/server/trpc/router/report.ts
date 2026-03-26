import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure } from "../trpc"

const reportReasons = ["SPAM", "HARASSMENT", "MISINFORMATION", "INAPPROPRIATE_CONTENT", "HATE_SPEECH", "OTHER"] as const

export const reportRouter = router({
  reportPost: authedProcedure
    .input(z.object({
      postId: z.string(),
      reason: z.enum(reportReasons),
      details: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const reporterId = ctx.session.user.id

      const post = await ctx.db.post.findUnique({ where: { id: input.postId }, select: { id: true, authorId: true } })
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" })
      if (post.authorId === reporterId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot report your own post" })

      const existing = await ctx.db.postReport.findUnique({
        where: { reporterId_postId: { reporterId, postId: input.postId } },
      })
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "You have already reported this post" })

      await ctx.db.postReport.create({
        data: {
          reporterId,
          postId: input.postId,
          reason: input.reason,
          details: input.details ?? null,
        },
      })
      return { success: true }
    }),

  getMyReports: authedProcedure.query(async ({ ctx }) => {
    return ctx.db.postReport.findMany({
      where: { reporterId: ctx.session.user.id },
      select: {
        id: true,
        postId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  getModerationQueue: authedProcedure
    .input(z.object({
      status: z.enum(["PENDING", "REVIEWED", "DISMISSED", "ACTIONED"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // In production this would be admin-only; for now any authenticated user can view
      const reports = await ctx.db.postReport.findMany({
        where: input.status ? { status: input.status } : {},
        select: {
          id: true,
          postId: true,
          reporterId: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (reports.length > input.limit) nextCursor = reports.pop()?.id
      return { reports, nextCursor }
    }),

  updateReportStatus: authedProcedure
    .input(z.object({
      reportId: z.string(),
      status: z.enum(["REVIEWED", "DISMISSED", "ACTIONED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.postReport.findUnique({ where: { id: input.reportId } })
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" })
      await ctx.db.postReport.update({
        where: { id: input.reportId },
        data: { status: input.status },
      })
      return { success: true }
    }),
})
