import { z } from "zod"
import { router, authedProcedure } from "../trpc"

export const notificationRouter = router({
  getAll: authedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const notifications = await ctx.db.notification.findMany({
        where: { recipientId: userId },
        include: {
          recipient: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
        orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      })

      // Fetch actor info separately (actorId is optional)
      const actorIds = [...new Set(notifications.map((n) => n.actorId).filter(Boolean) as string[])]
      const actors = actorIds.length
        ? await ctx.db.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true },
          })
        : []
      const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]))

      let nextCursor: string | undefined
      if (notifications.length > input.limit) {
        nextCursor = notifications.pop()?.id
      }

      return {
        notifications: notifications.map((n) => ({
          ...n,
          actor: n.actorId ? actorMap[n.actorId] : null,
        })),
        nextCursor,
      }
    }),

  getCount: authedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: { recipientId: ctx.session.user.id, isRead: false },
    })
    return { count }
  }),

  markRead: authedProcedure
    .input(z.object({ id: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      if (input.id) {
        await ctx.db.notification.updateMany({
          where: { id: input.id, recipientId: userId },
          data: { isRead: true },
        })
      } else {
        // Mark all as read
        await ctx.db.notification.updateMany({
          where: { recipientId: userId, isRead: false },
          data: { isRead: true },
        })
      }
      return { success: true }
    }),
})
