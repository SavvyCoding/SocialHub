import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure } from "../trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"
import { eventBus } from "@/server/events/event-bus"
import { invalidateUserCaches } from "@/server/services/social-graph.service"

export const followRouter = router({
  follow: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const followerId = ctx.session.user.id
      if (followerId === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot follow yourself" })
      }
      await RATE_LIMITS.follow(followerId)

      const existing = await ctx.db.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId: input.userId } },
      })
      if (existing) return { following: true }

      await ctx.db.follow.create({ data: { followerId, followingId: input.userId } })
      eventBus.emit("user.followed", { followerId, followingId: input.userId })
      return { following: true }
    }),

  unfollow: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.follow.deleteMany({
        where: { followerId: ctx.session.user.id, followingId: input.userId },
      })
      eventBus.emit("user.unfollowed", { followerId: ctx.session.user.id, followingId: input.userId })
      return { following: false }
    }),

  isFollowing: authedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const follow = await ctx.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        },
      })
      return { following: !!follow }
    }),

  getFollowers: authedProcedure
    .input(z.object({ userId: z.string(), cursor: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const follows = await ctx.db.follow.findMany({
        where: { followingId: input.userId },
        include: {
          follower: {
            select: { id: true, name: true, username: true, avatarUrl: true, bio: true, isVerified: true },
          },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      })
      let nextCursor: string | undefined
      if (follows.length > input.limit) {
        nextCursor = follows.pop()?.id
      }
      return { followers: follows.map((f) => f.follower), nextCursor }
    }),

  getFollowing: authedProcedure
    .input(z.object({ userId: z.string(), cursor: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const follows = await ctx.db.follow.findMany({
        where: { followerId: input.userId },
        include: {
          following: {
            select: { id: true, name: true, username: true, avatarUrl: true, bio: true, isVerified: true },
          },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      })
      let nextCursor: string | undefined
      if (follows.length > input.limit) {
        nextCursor = follows.pop()?.id
      }
      return { following: follows.map((f) => f.following), nextCursor }
    }),

  sendFriendRequest: authedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const requesterId = ctx.session.user.id
      if (requesterId === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot send request to yourself" })
      }
      const existing = await ctx.db.friendRequest.findFirst({
        where: {
          OR: [
            { requesterId, requesteeId: input.userId },
            { requesterId: input.userId, requesteeId: requesterId },
          ],
        },
      })
      if (existing) return existing

      const request = await ctx.db.friendRequest.create({
        data: { requesterId, requesteeId: input.userId },
      })
      eventBus.emit("friendRequest.sent", { requestId: request.id, requesterId, requesteeId: input.userId })
      return request
    }),

  respondFriendRequest: authedProcedure
    .input(z.object({ requestId: z.string(), accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.friendRequest.findUnique({ where: { id: input.requestId } })
      if (!request || request.requesteeId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" })
      }
      const updated = await ctx.db.friendRequest.update({
        where: { id: input.requestId },
        data: { status: input.accept ? "ACCEPTED" : "REJECTED" },
      })
      if (input.accept) {
        // Auto-follow each other
        await ctx.db.follow.createMany({
          data: [
            { followerId: request.requesteeId, followingId: request.requesterId },
            { followerId: request.requesterId, followingId: request.requesteeId },
          ],
          skipDuplicates: true,
        })
        eventBus.emit("friendRequest.accepted", { requestId: request.id, requesterId: request.requesterId, requesteeId: request.requesteeId })
      }
      return updated
    }),

  getPendingRequests: authedProcedure.query(async ({ ctx }) => {
    return ctx.db.friendRequest.findMany({
      where: { requesteeId: ctx.session.user.id, status: "PENDING" },
      include: {
        requester: {
          select: { id: true, name: true, username: true, avatarUrl: true, isVerified: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }),
})
