import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure } from "../trpc"
import { eventBus } from "@/server/events/event-bus"

const STORY_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export const storyRouter = router({
  // Active stories from followed users + self, grouped by user
  getActiveForFeed: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const now = new Date()

    // Get list of users this user follows
    const following = await ctx.db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const userIds = [userId, ...following.map((f) => f.followingId)]

    const stories = await ctx.db.story.findMany({
      where: {
        authorId: { in: userIds },
        expiresAt: { gt: now },
      },
      include: {
        author: {
          select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true },
        },
        views: { where: { viewerId: userId }, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    })

    // Group by author
    const grouped = new Map<string, typeof stories>()
    for (const story of stories) {
      const existing = grouped.get(story.authorId) ?? []
      grouped.set(story.authorId, [...existing, story])
    }

    return Array.from(grouped.values()).map((userStories) => ({
      author: userStories[0].author,
      stories: userStories.map((s) => ({ ...s, isSeen: s.views.length > 0 })),
      hasUnseen: userStories.some((s) => s.views.length === 0),
    }))
  }),

  getByUser: authedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const viewerId = ctx.session.user.id
      return ctx.db.story.findMany({
        where: { authorId: input.userId, expiresAt: { gt: new Date() } },
        include: {
          author: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
          views: { where: { viewerId }, select: { id: true }, take: 1 },
        },
        orderBy: { createdAt: "asc" },
      })
    }),

  create: authedProcedure
    .input(z.object({
      mediaUrl: z.string().url(),
      mediaType: z.enum(["IMAGE", "VIDEO", "GIF"]),
      caption: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(Date.now() + STORY_DURATION_MS)
      return ctx.db.story.create({
        data: {
          authorId: ctx.session.user.id,
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType,
          caption: input.caption,
          expiresAt,
        },
        include: {
          author: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
        },
      })
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const story = await ctx.db.story.findUnique({ where: { id: input.id } })
      if (!story || story.authorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }
      await ctx.db.story.delete({ where: { id: input.id } })
      return { success: true }
    }),

  markViewed: authedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const story = await ctx.db.story.findUnique({ where: { id: input.storyId }, select: { id: true, authorId: true } })
      if (!story) throw new TRPCError({ code: "NOT_FOUND", message: "Story not found" })

      await ctx.db.storyView.upsert({
        where: {
          storyId_viewerId: { storyId: input.storyId, viewerId: ctx.session.user.id },
        },
        create: { storyId: input.storyId, viewerId: ctx.session.user.id },
        update: {},
      })
      if (story.authorId !== ctx.session.user.id) {
        eventBus.emit("story.viewed", { storyId: input.storyId, viewerId: ctx.session.user.id, authorId: story.authorId })
      }
      return { success: true }
    }),

  getViewers: authedProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const story = await ctx.db.story.findUnique({ where: { id: input.storyId } })
      if (!story || story.authorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" })
      }
      return ctx.db.storyView.findMany({
        where: { storyId: input.storyId },
        include: {
          story: { select: { id: true } },
        },
        orderBy: { viewedAt: "desc" },
      })
    }),
})
