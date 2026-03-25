import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, authedProcedure, publicProcedure } from "../trpc"
import { RATE_LIMITS } from "@/lib/rate-limit"

const TMDB_BASE = "https://api.themoviedb.org/3"
const CACHE_TTL = 60 * 30 // 30 minutes

interface TMDBResult {
  id: number
  media_type: "movie" | "tv" | "person"
  title?: string
  name?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  overview?: string
  vote_average?: number
}

async function tmdbFetch(path: string, token: string) {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
  if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "TMDB unavailable" })
  return res.json()
}

export const movieRouter = router({
  // ─── Search TMDB ──────────────────────────────────────────────
  search: authedProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const token = process.env.TMDB_READ_ACCESS_TOKEN
      if (!token) return [] as TMDBResult[]

      const cacheKey = `tmdb:search:${input.q.toLowerCase().trim()}`
      const cached = await ctx.redis.get(cacheKey).catch(() => null)
      if (cached) return JSON.parse(cached) as TMDBResult[]

      const data = await tmdbFetch(
        `/search/multi?query=${encodeURIComponent(input.q)}&page=1&include_adult=false`,
        token
      ) as { results: TMDBResult[] }

      const results = data.results
        .filter((r) => r.media_type === "movie" || r.media_type === "tv")
        .slice(0, 12)

      await ctx.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results)).catch(() => {})
      return results
    }),

  // ─── Get watchlist (public) ───────────────────────────────────
  getWatchlist: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(["ALL", "WANT_TO_WATCH", "WATCHING", "WATCHED", "DROPPED"]).default("ALL"),
        mediaType: z.enum(["ALL", "MOVIE", "TV"]).default("ALL"),
        cursor: z.string().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, status, mediaType, cursor, limit } = input
      const entries = await ctx.db.movieEntry.findMany({
        where: {
          userId,
          ...(status !== "ALL" ? { status } : {}),
          ...(mediaType !== "ALL" ? { mediaType } : {}),
        },
        orderBy: [{ status: "asc" }, { watchedAt: "desc" }, { createdAt: "desc" }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      })
      let nextCursor: string | undefined
      if (entries.length > limit) nextCursor = entries.pop()?.id
      return { entries, nextCursor }
    }),

  // ─── Add entry ────────────────────────────────────────────────
  addMovie: authedProcedure
    .input(
      z.object({
        tmdbId: z.number().int(),
        mediaType: z.enum(["MOVIE", "TV"]),
        title: z.string(),
        posterUrl: z.string().url().optional(),
        releaseYear: z.number().int().optional(),
        status: z.enum(["WANT_TO_WATCH", "WATCHING", "WATCHED", "DROPPED"]).default("WANT_TO_WATCH"),
        rating: z.number().int().min(1).max(10).optional(),
        review: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await RATE_LIMITS.showcaseAdd(ctx.session.user.id)
      const { tmdbId, mediaType, ...rest } = input
      const watchedAt = rest.status === "WATCHED" ? new Date() : undefined

      return ctx.db.movieEntry.upsert({
        where: { userId_tmdbId_mediaType: { userId: ctx.session.user.id, tmdbId, mediaType } },
        create: { userId: ctx.session.user.id, tmdbId, mediaType, ...rest, watchedAt },
        update: { ...rest, ...(watchedAt ? { watchedAt } : {}) },
      })
    }),

  // ─── Update entry ─────────────────────────────────────────────
  updateMovie: authedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["WANT_TO_WATCH", "WATCHING", "WATCHED", "DROPPED"]).optional(),
        rating: z.number().int().min(1).max(10).nullable().optional(),
        review: z.string().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.movieEntry.findUnique({ where: { id: input.id } })
      if (!entry || entry.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })

      const { id, status, ...rest } = input
      const extra: Record<string, unknown> = {}
      if (status === "WATCHED" && !entry.watchedAt) extra.watchedAt = new Date()

      return ctx.db.movieEntry.update({
        where: { id },
        data: { ...rest, ...(status ? { status } : {}), ...extra },
      })
    }),

  // ─── Remove entry ─────────────────────────────────────────────
  removeMovie: authedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.movieEntry.findUnique({ where: { id: input.id } })
      if (!entry || entry.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" })
      await ctx.db.movieEntry.delete({ where: { id: input.id } })
      return { success: true }
    }),

  // ─── Stats ────────────────────────────────────────────────────
  getStats: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const counts = await ctx.db.movieEntry.groupBy({
        by: ["status", "mediaType"],
        where: { userId: input.userId },
        _count: true,
      })
      const total = counts.reduce((s, c) => s + c._count, 0)
      return { total, breakdown: counts.map((c) => ({ status: c.status, mediaType: c.mediaType, count: c._count })) }
    }),
})
