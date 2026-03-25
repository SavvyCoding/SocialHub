import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure } from "../trpc"
import { eventBus } from "@/server/events/event-bus"
import { audit } from "@/server/services/audit.service"

export const blockRouter = router({
  // Block a user
  block: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const blockerId = ctx.session.user.id
      if (blockerId === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot block yourself" })
      }

      await ctx.db.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId: input.userId } },
        create: { blockerId, blockedId: input.userId },
        update: {},
      })

      // Remove mutual follows when blocking
      await ctx.db.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: input.userId },
            { followerId: input.userId, followingId: blockerId },
          ],
        },
      })

      eventBus.emit("user.blocked", { blockerId, blockedId: input.userId })
      audit({ db: ctx.db, userId: blockerId, action: "block", resource: "user", resourceId: input.userId }).catch(() => {})
      return { isBlocked: true }
    }),

  // Unblock a user
  unblock: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const blockerId = ctx.session.user.id
      await ctx.db.block.deleteMany({
        where: { blockerId, blockedId: input.userId },
      })
      eventBus.emit("user.unblocked", { blockerId, blockedId: input.userId })
      audit({ db: ctx.db, userId: blockerId, action: "unblock", resource: "user", resourceId: input.userId }).catch(() => {})
      return { isBlocked: false }
    }),

  // Mute a user
  mute: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const muterId = ctx.session.user.id
      if (muterId === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot mute yourself" })
      }

      await ctx.db.mute.upsert({
        where: { muterId_mutedId: { muterId, mutedId: input.userId } },
        create: { muterId, mutedId: input.userId },
        update: {},
      })
      eventBus.emit("user.muted", { muterId, mutedId: input.userId })
      return { isMuted: true }
    }),

  // Unmute a user
  unmute: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const muterId = ctx.session.user.id
      await ctx.db.mute.deleteMany({
        where: { muterId, mutedId: input.userId },
      })
      eventBus.emit("user.unmuted", { muterId, mutedId: input.userId })
      return { isMuted: false }
    }),

  // Get block+mute status for a user (single combined query)
  getStatus: authedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const myId = ctx.session.user.id
      const [block, mute, theyBlockedMe] = await Promise.all([
        ctx.db.block.findUnique({
          where: { blockerId_blockedId: { blockerId: myId, blockedId: input.userId } },
        }),
        ctx.db.mute.findUnique({
          where: { muterId_mutedId: { muterId: myId, mutedId: input.userId } },
        }),
        ctx.db.block.findUnique({
          where: { blockerId_blockedId: { blockerId: input.userId, blockedId: myId } },
        }),
      ])
      return {
        isBlocked: !!block,
        isMuted: !!mute,
        isBlockedByThem: !!theyBlockedMe,
      }
    }),

  // List users blocked by the current user
  getBlocked: authedProcedure.query(async ({ ctx }) => {
    const blocks = await ctx.db.block.findMany({
      where: { blockerId: ctx.session.user.id },
      include: {
        blocked: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return blocks.map((b) => b.blocked)
  }),

  // List users muted by the current user
  getMuted: authedProcedure.query(async ({ ctx }) => {
    const mutes = await ctx.db.mute.findMany({
      where: { muterId: ctx.session.user.id },
      include: {
        muted: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return mutes.map((m) => m.muted)
  }),
})
