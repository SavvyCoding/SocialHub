import { z } from "zod"
import { router, authedProcedure } from "../trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"
import {
  searchSimilarPosts,
  searchSimilarUsers,
  getRecommendedPosts,
  getRecommendedUsers,
} from "@/server/services/embedding.service"
import {
  getExcludedUserIds,
  batchGetInteractions,
  authorSelect,
  countSelect,
} from "@/server/services/social-graph.service"

export const searchRouter = router({
  semanticPosts: authedProcedure
    .input(z.object({ query: z.string().min(1).max(500), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.readFeed(userId)

      const excludedIds = await getExcludedUserIds(ctx.db, ctx.redis, userId)
      const results = await searchSimilarPosts(ctx.db, input.query, { limit: input.limit })

      const postIds = results.map((r) => r.entityId)
      if (postIds.length === 0) return { posts: [] }

      const posts = await ctx.db.post.findMany({
        where: { id: { in: postIds }, authorId: { notIn: excludedIds } },
        include: {
          author: { select: authorSelect },
          _count: { select: countSelect },
        },
      })

      const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

      // Preserve similarity ordering
      const postMap = new Map(posts.map((p) => [p.id, p]))
      const ordered = postIds
        .map((id) => postMap.get(id))
        .filter(Boolean)
        .map((p) => ({
          ...p!,
          ...(interactions.get(p!.id) ?? { isLiked: false, isShared: false, isBookmarked: false }),
        }))

      return { posts: ordered }
    }),

  semanticUsers: authedProcedure
    .input(z.object({ query: z.string().min(1).max(500), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.readProfile(userId)

      const excludedIds = await getExcludedUserIds(ctx.db, ctx.redis, userId)
      const results = await searchSimilarUsers(ctx.db, input.query, {
        limit: input.limit,
        excludeUserIds: [userId, ...excludedIds],
      })

      const userIds = results.map((r) => r.entityId)
      if (userIds.length === 0) return { users: [] }

      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: { ...authorSelect, bio: true, location: true },
      })

      const userMap = new Map(users.map((u) => [u.id, u]))
      const ordered = userIds.map((id) => userMap.get(id)).filter(Boolean)

      return { users: ordered }
    }),

  recommendedPosts: authedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.readFeed(userId)

      const excludedIds = await getExcludedUserIds(ctx.db, ctx.redis, userId)
      const results = await getRecommendedPosts(ctx.db, userId, { limit: input.limit })

      const postIds = results.map((r) => r.entityId)
      if (postIds.length === 0) return { posts: [] }

      const posts = await ctx.db.post.findMany({
        where: { id: { in: postIds }, authorId: { notIn: excludedIds }, visibility: "PUBLIC" },
        include: {
          author: { select: authorSelect },
          _count: { select: countSelect },
        },
      })

      const interactions = await batchGetInteractions(ctx.db, userId, posts.map((p) => p.id))

      const postMap = new Map(posts.map((p) => [p.id, p]))
      const ordered = postIds
        .map((id) => postMap.get(id))
        .filter(Boolean)
        .map((p) => ({
          ...p!,
          ...(interactions.get(p!.id) ?? { isLiked: false, isShared: false, isBookmarked: false }),
        }))

      return { posts: ordered }
    }),

  recommendedUsers: authedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      await RATE_LIMITS.readProfile(userId)

      const excludedIds = await getExcludedUserIds(ctx.db, ctx.redis, userId)
      const results = await getRecommendedUsers(ctx.db, userId, {
        limit: input.limit,
        excludeUserIds: excludedIds,
      })

      const userIds = results.map((r) => r.entityId)
      if (userIds.length === 0) return { users: [] }

      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: { ...authorSelect, bio: true, location: true },
      })

      const userMap = new Map(users.map((u) => [u.id, u]))
      const ordered = userIds.map((id) => userMap.get(id)).filter(Boolean)

      return { users: ordered }
    }),
})
