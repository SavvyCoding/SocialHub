import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure } from "../trpc"

export const closeFriendRouter = router({
  addCloseFriend: authedProcedure
    .input(z.object({ friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      if (userId === input.friendId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot add yourself as a close friend" })
      }

      const friend = await ctx.db.user.findUnique({ where: { id: input.friendId }, select: { id: true } })
      if (!friend) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })

      await ctx.db.closeFriend.upsert({
        where: { userId_friendId: { userId, friendId: input.friendId } },
        create: { userId, friendId: input.friendId },
        update: {},
      })
      return { added: true }
    }),

  removeCloseFriend: authedProcedure
    .input(z.object({ friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const existing = await ctx.db.closeFriend.findUnique({
        where: { userId_friendId: { userId, friendId: input.friendId } },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Close friend not found" })
      await ctx.db.closeFriend.delete({
        where: { userId_friendId: { userId, friendId: input.friendId } },
      })
      return { removed: true }
    }),

  getMyCloseFriends: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const entries = await ctx.db.closeFriend.findMany({
      where: { userId },
      include: {
        friend: { select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true } },
      },
      orderBy: { createdAt: "asc" },
    })
    return entries.map((e) => e.friend)
  }),

  isCloseFriend: authedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const entry = await ctx.db.closeFriend.findUnique({
        where: { userId_friendId: { userId, friendId: input.friendId } },
      })
      return { isCloseFriend: !!entry }
    }),
})
