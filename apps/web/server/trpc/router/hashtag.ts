import { z } from "zod"
import { router, authedProcedure } from "../trpc"

export const hashtagRouter = router({
  // Top hashtags by post count in the last N hours
  getTrending: authedProcedure
    .input(z.object({ limit: z.number().default(10), hours: z.number().default(48) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.hours * 60 * 60 * 1000)

      const grouped = await ctx.db.postHashtag.groupBy({
        by: ["hashtagId"],
        where: {
          post: { createdAt: { gte: since }, visibility: "PUBLIC" },
        },
        _count: { hashtagId: true },
        orderBy: { _count: { hashtagId: "desc" } },
        take: input.limit,
      })

      if (grouped.length === 0) return []

      const ids = grouped.map((g) => g.hashtagId)
      const hashtags = await ctx.db.hashtag.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
      const nameMap = Object.fromEntries(hashtags.map((h) => [h.id, h.name]))

      return grouped
        .map((g) => ({ name: nameMap[g.hashtagId], count: g._count.hashtagId }))
        .filter((g): g is { name: string; count: number } => !!g.name)
    }),

  // Find hashtags whose name contains the query
  search: authedProcedure
    .input(z.object({ q: z.string().min(1).max(100), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.hashtag.findMany({
        where: { name: { contains: input.q.toLowerCase() } },
        include: { _count: { select: { posts: true } } },
        orderBy: { posts: { _count: "desc" } },
        take: input.limit,
      })
      return rows.map((r) => ({ name: r.name, count: r._count.posts }))
    }),
})
