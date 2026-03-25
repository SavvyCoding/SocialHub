import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure, publicProcedure } from "../trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"

const OL_SEARCH = "https://openlibrary.org/search.json"
const CACHE_TTL = 60 * 60 // 1 hour

interface OLDoc {
  key: string
  title: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
}

export const bookRouter = router({
  // ─── Search Open Library ──────────────────────────────────────
  search: authedProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `ol:search:${input.q.toLowerCase().trim()}`

      // Try cache first
      const cached = await ctx.redis.get(cacheKey).catch(() => null)
      if (cached) return JSON.parse(cached) as OLDoc[]

      const url = `${OL_SEARCH}?q=${encodeURIComponent(input.q)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year`
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Open Library unavailable" })

      const data = (await res.json()) as { docs: OLDoc[] }
      const results = data.docs.slice(0, 12)

      await ctx.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results)).catch(() => {})
      return results
    }),

  // ─── Get shelf (public) ───────────────────────────────────────
  getShelf: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(["ALL", "WANT_TO_READ", "READING", "READ", "DID_NOT_FINISH"]).default("ALL"),
        cursor: z.string().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, status, cursor, limit } = input
      const entries = await ctx.db.bookEntry.findMany({
        where: {
          userId,
          ...(status !== "ALL" ? { status } : {}),
        },
        orderBy: [{ status: "asc" }, { finishedAt: "desc" }, { createdAt: "desc" }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (entries.length > limit) nextCursor = entries.pop()?.id
      return { entries, nextCursor }
    }),

  // ─── Add book ─────────────────────────────────────────────────
  addBook: authedProcedure
    .input(
      z.object({
        olWorkId: z.string(),
        title: z.string(),
        author: z.string().optional(),
        coverUrl: z.string().url().optional(),
        publishYear: z.number().int().optional(),
        status: z.enum(["WANT_TO_READ", "READING", "READ", "DID_NOT_FINISH"]).default("WANT_TO_READ"),
        rating: z.number().int().min(1).max(5).optional(),
        review: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await RATE_LIMITS.showcaseAdd(ctx.session.user.id)
      const { olWorkId, ...rest } = input
      const startedAt = rest.status === "READING" ? new Date() : undefined
      const finishedAt = rest.status === "READ" ? new Date() : undefined

      return ctx.db.bookEntry.upsert({
        where: { userId_olWorkId: { userId: ctx.session.user.id, olWorkId } },
        create: { userId: ctx.session.user.id, olWorkId, ...rest, startedAt, finishedAt },
        update: { ...rest, ...(startedAt ? { startedAt } : {}), ...(finishedAt ? { finishedAt } : {}) },
      })
    }),

  // ─── Update entry ─────────────────────────────────────────────
  updateBook: authedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["WANT_TO_READ", "READING", "READ", "DID_NOT_FINISH"]).optional(),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        review: z.string().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.bookEntry.findUnique({ where: { id: input.id } })
      if (!entry || entry.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })

      const { id, status, ...rest } = input
      const extra: Record<string, unknown> = {}
      if (status === "READING" && !entry.startedAt) extra.startedAt = new Date()
      if (status === "READ" && !entry.finishedAt) extra.finishedAt = new Date()

      return ctx.db.bookEntry.update({
        where: { id },
        data: { ...rest, ...(status ? { status } : {}), ...extra },
      })
    }),

  // ─── Remove book ──────────────────────────────────────────────
  removeBook: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.bookEntry.findUnique({ where: { id: input.id } })
      if (!entry || entry.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      await ctx.db.bookEntry.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // ─── Stats ────────────────────────────────────────────────────
  getStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const counts = await ctx.db.bookEntry.groupBy({
        by: ["status"],
        where: { userId: input.userId },
        _count: true,
      })
      const total = counts.reduce((s, c) => s + c._count, 0)
      return { total, byStatus: Object.fromEntries(counts.map((c) => [c.status, c._count])) }
    }),
})
